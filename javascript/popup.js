function setPasswordColors(foreground, background) {
    $("#generated, #password, #confirmation").css({"background-color": background,"color": foreground});
}

function getAutoProfileIdForUrl(url) {
    var profiles = Settings.getProfiles();
    for (var i in profiles) {
        var profile = profiles[i];
        if (profile.siteList) {
            var usedURL = profile.getUrl(url);
            var sites = profile.siteList.split(' ');
            for (var j = 0; j < sites.length; j++) {
                var pat = sites[j];

                if (pat[0] == '/' && pat[pat.length-1] == '/') {
                    pat = pat.substr(1, pat.length-2);
                } else {
                    pat = pat.replace(/[$+()^\[\]\\|{},]/g, '');
                    pat = pat.replace(/\?/g, '.');
                    pat = pat.replace(/\*/g, '.*');
                }

                if (pat[0] != '^') pat = '^' + pat;
                if (pat[pat.length-1] != '$') pat = pat + '$';

                var re;
                try {
                    re = new RegExp(pat);
                } catch(e) {
                    console.log(e + "\n");
                }

                if ((re.test(usedURL) && usedURL !== "") || re.test(url)) {
                    return profile.id;
                }
            }
        }
    }
    return null;
}

function updateFields() {
    var password = $("#password").val();
    var confirmation = $("#confirmation").val();
    var usedURL = $("#usedtext").prop("alt");

    var profileId = $("#profile").val();
    if (getAutoProfileIdForUrl(usedURL) !== null) {
        profileId = getAutoProfileIdForUrl(usedURL);
    } else {
        Settings.setActiveProfileId(profileId);
    }
    var profile = Settings.getProfile(profileId);

    Settings.setStoreLocation($("#store_location").val());
    Settings.setPassword(password);
    $("#copypassword, #injectpasswordrow").css("visibility", "hidden");

    if (password === "") {
        $("#generatedForClipboard").val("");
        $("#generated").val("Please Enter Password");
        setPasswordColors("#000000", "#85FFAB");
    } else if ( !matchesHash(password) ) {
        $("#generatedForClipboard").val("");
        $("#generated").val("Master Password Mismatch");
        setPasswordColors("#FFFFFF", "#FF7272");
    } else if (!Settings.keepMasterPasswordHash() && password !== confirmation) {
        $("#generatedForClipboard").val("");
        $("#generated").val("Passwords Don't Match");
        setPasswordColors("#FFFFFF", "#FF7272");
    } else {
        if (profile !== null) {
            var generatedPassword = profile.getPassword($("#usedtext").val(), password);
            $("#generated").val(generatedPassword);
            $("#generatedForClipboard").val(generatedPassword);
        } else {
            $("#generated, #generatedForClipboard").val("");
        }
        showButtons();
        setPasswordColors("#008000", "#FFFFFF");
    }

    if (Settings.keepMasterPasswordHash()) {
        $("#confirmation_row").hide();
    } else {
        $("#confirmation_row").show();
    }
}

function matchesHash(password) {
    if (!Settings.keepMasterPasswordHash()) return true;
    var saved_hash = Settings.masterPasswordHash();
    var new_hash = ChromePasswordMaker_SecureHash.make_hash(password);
    return new_hash === saved_hash;
}

function updateURL(url) {
    var profileId = $("#profile").val();

    var profile = Settings.getProfile(profileId);
    // Store url in ALT attribute
    $("#usedtext").prop("alt", url);
    // Store either matched url or, if set, use profiles own "use text"
    var text = ""
    if (profile.getText() !== "") {
        text = profile.getText();
    } else {
        text = profile.getUrl(url);
    }
    $("#usedtext").val(text);
}

function onProfileChanged() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        updateURL(tabs[0].url);
        updateFields();
    });
}

function showButtons() {
    $("#copypassword").css("visibility", "visible");
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {hasPasswordField: true}, function(response) {
            if (response && response.hasField) {
                $("#injectpasswordrow").css("visibility", "visible");
            }
        });
    });
}

function init(url) {
    var pass = Settings.getPassword();
    $("#password").val(pass);
    $("#confirmation").val(pass);

    if (Settings.shouldDisablePasswordSaving()) {
        $("#store_location_row").hide();
    }

    Settings.getProfiles().forEach(function(profile) {
        $("#profile").append("<option value='" + profile.id + "'>" + profile.title + "</option>");
    });
    $("#profile").val(getAutoProfileIdForUrl(url) || Settings.getProfiles()[0].id);


    updateURL(url);
    $("#store_location").val(Settings.storeLocation);
    updateFields();

    if (pass === null || pass.length === 0 || (pass !== $("#confirmation").val())) {
        $("#password").focus();
    } else {
        $("#generated").focus();
    }
}

function fillPassword() {
    var pass = $("#generatedForClipboard").val();
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {password: pass});
    });
    alert("Password: "+pass+" should now be filled");
    window.close();
}

function copyPassword() {
    document.getElementById("generatedForClipboard").select();
    document.execCommand("Copy");
    window.close();
}

function openOptions() {
    chrome.tabs.create({url: "html/options.html"});
    window.close();
}

function showPasswordField() {
    $("#activatePassword").hide();
    $("#generated").show().focus();
}

function sendFillPassword() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {hasPasswordField: true}, function(response) {
            if (response && response.hasField) {
                fillPassword();
            }
        });
    });
}

$(function() {
    $("#password, #confirmation, #usedtext").on("keyup", updateFields);
    $("#store_location").on("change", updateFields);
    $("#profile").on("change", onProfileChanged);
    $("#activatePassword").on("click", showPasswordField);
    $("#copypassword").on("click", copyPassword);
    $("#injectpasswordrow").on("click", fillPassword);
    $("#options").on("click", openOptions);

    if (Settings.shouldHidePassword()) {
        $("#generated").hide();
        $("#activatePassword").show();
    } else {
        $("#generated").show();
        $("#activatePassword").hide();
    }

    if (Settings.keepMasterPasswordHash()) {
        var saved_hash = Settings.masterPasswordHash();
        if (saved_hash.charAt(0) !== "n") {
            saved_hash = ChromePasswordMaker_SecureHash.update_old_hash(saved_hash);
            Settings.setMasterPasswordHash(saved_hash);
        }
    }

    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        init(tabs[0].url);
    });

    $("#password, #confirmation, #generated").on("keydown", function(event) {
        if (event.keyCode === 13) { // 13 is the character code of the return key
            sendFillPassword();
        }
    });
});
