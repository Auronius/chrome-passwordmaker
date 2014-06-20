var currentProfile = "";

function updateStyle(element, selected, isSelected) {
    if (isSelected) {
        element.addClass(selected);
    } else {
        element.removeClass(selected);
    }
}

function updateExample() {
    updateStyle($("#exprotocol"), "selected", $("#protocolCB").prop("checked"));
    updateStyle($("#exsubdomain"), "selected", $("#subdomainCB").prop("checked"));
    updateStyle($("#exdomain"), "selected", $("#domainCB").prop("checked"));
    updateStyle($("#expath"), "selected", $("#pathCB").prop("checked"));
}

function updateLeet() {
    $("#leetLevelLB").prop("disabled", $("#whereLeetLB").val() === "off");
    updateStyle($("#leetLevelLabel"), "disabled", $("#whereLeetLB").val() === "off");
}

function addProfile() {
    var p = new Profile();
    p.title = "No name";
    Settings.addProfile(p);
    updateProfileList();
    setCurrentProfile(p);
}

function removeProfile() {
    if (confirm("Really delete this profile?")) {
        Settings.deleteProfile(currentProfile);
        currentProfile = Settings.getProfiles()[0];
        updateProfileList();
        setCurrentProfile(currentProfile);
    }
}

function setCurrentProfile(profile) {
    currentProfile = profile;
    $("#profileNameTB").val(profile.title);
    $("#siteList").val(profile.siteList);
    $("#protocolCB").prop("checked", profile.url_protocol);
    $("#subdomainCB").prop("checked", profile.url_subdomain);
    $("#domainCB").prop("checked", profile.url_domain);
    $("#pathCB").prop("checked", profile.url_path);
    $("#inputUseThisText").val(profile.strUseText);
    $("#whereLeetLB").val(profile.whereToUseL33t);
    $("#leetLevelLB").val(profile.l33tLevel);
    $("#hashAlgorithmLB").val(profile.hashAlgorithm);
    $("#passwdLength").val(profile.passwordLength);
    $("#usernameTB").val(profile.username);
    $("#modifier").val(profile.modifier);
    $("#passwordPrefix").val(profile.passwordPrefix);
    $("#passwordSuffix").val(profile.passwordSuffix);

    $("#charset").empty();
    for (var i = 0; i < CHARSET_OPTIONS.length; i++) {
        $("#charset").append("<option>" + CHARSET_OPTIONS[i] + "</option>");
    }
    $("#charset").append("<option>Custom charset</option>");

    $("#charset").on("change", function() {
        if ($("#charset").val() === "Custom charset") {
            $("#customCharset").val(profile.selectedCharset).show();
        } else {
            $("#customCharset").hide();
        }
    });

    if (CHARSET_OPTIONS.indexOf(profile.selectedCharset) >= 0) {
        $("#charset").val(profile.selectedCharset);
        $("#customCharset").hide();
    } else {
        $("#charset").val("Custom charset");
        $("#customCharset").val(profile.selectedCharset).show();
    }

    updateExample();
    updateLeet();
    highlightProfile();
    // Keeps profile #1 around so it can only be re-named
    if (Settings.getProfiles()[0].id === profile.id) {
        $("#remove").hide();
    } else {
        $("#remove").show();
    }

    showSection("#profile_settings");
}

function showImport() {
    showSection("#import_settings");
}

function showExport() {
    showSection("#export_settings");
    $("#exportText").val(RdfImporter.dumpDoc());
}

function importRdf() {
    var txt = $("#importText").val();
    var count = 0;

    if (txt.trim().length === 0) {
        alert("Import text is empty");
        return false;
    }

    var rdfDoc = RdfImporter.loadDoc(txt);
    // Check that profiles have been parsed and are available before wiping current data
    if (rdfDoc && rdfDoc.profiles && rdfDoc.profiles.length && $("#importOverwrite").prop("checked")) {
        Settings.profiles = JSON.parse(JSON.stringify(rdfDoc.profiles));
        for (var i = 0; i < Settings.profiles.length; i++) {
            Settings.profiles[i].id = i + 1;
        }
        count = rdfDoc.profiles.length;
        Settings.saveProfiles();
    } else {
        count = RdfImporter.saveProfiles(rdfDoc.profiles);
    }

    if (count === 0) {
        alert("Sorry, no profiles found");
        return false;
    }

    updateProfileList();
}

function copyRdfExport() {
    $("#exportText").select();
    document.execCommand("copy");
}

function showOptions() {
    showSection("#general_settings");
}

function showInformation() {
    showSection("#general_information");
}

function showSection(showId) {
    if ($(showId).is(":hidden")) {
        $("#profile_settings, #import_settings, #export_settings, #general_settings, #general_information").hide();
        $(showId).show();
    }
}

function highlightProfile() {
    $(".highlight").removeClass("highlight");
    $("#profile_" + currentProfile.id).addClass("highlight");
}

function saveProfile() {
    currentProfile.title          = $("#profileNameTB").val().trim();
    currentProfile.siteList       = $("#siteList").val().trim();
    currentProfile.url_protocol   = $("#protocolCB").prop("checked");
    currentProfile.url_subdomain  = $("#subdomainCB").prop("checked");
    currentProfile.url_domain     = $("#domainCB").prop("checked");
    currentProfile.url_path       = $("#pathCB").prop("checked");
    currentProfile.strUseText     = $("#inputUseThisText").val().trim();
    currentProfile.whereToUseL33t = $("#whereLeetLB").val();
    currentProfile.l33tLevel      = $("#leetLevelLB").val();
    currentProfile.hashAlgorithm  = $("#hashAlgorithmLB").val();
    currentProfile.passwordLength = $("#passwdLength").val();
    currentProfile.username       = $("#usernameTB").val().trim();
    currentProfile.modifier       = $("#modifier").val().trim();
    currentProfile.passwordPrefix = $("#passwordPrefix").val();
    currentProfile.passwordSuffix = $("#passwordSuffix").val();

    if ($("#charset").val() === "Custom charset") {
        currentProfile.selectedCharset = $("#customCharset").val();
    } else {
        currentProfile.selectedCharset = $("#charset").val();
    }

    Settings.setProfile(currentProfile);
    Settings.saveProfiles();
    updateProfileList();
    highlightProfile();
}

function cloneProfile() {
    var p = JSON.parse(JSON.stringify(currentProfile));
    p.title = p.title + " Copy";
    Settings.addProfile(p);
    updateProfileList();
    setCurrentProfile(p);
}

function editProfile(event) {
    setCurrentProfile(Settings.getProfile(event.target.id.slice(8)));
}

function updateProfileList() {
    var profiles = Settings.getProfiles();
    $("#profile_list").empty();
    for (var i = 0; i < profiles.length; i++) {
        $("#profile_list").append("<li><span id='profile_" + profiles[i].id + "' class='link'>" + profiles[i].title + "</span></li>")
    }
}

function setSyncPassword() {
    if ($("#syncProfilesPassword").val() === "") {
        return;
    }

    var result = Settings.startSyncWith($("#syncProfilesPassword").val());
    if (result) {
        Settings.setSyncProfiles(true);
        localStorage["sync_profiles_password"] = result;
        $("#syncProfilesPassword").val("");
        updateSyncProfiles();
        updateProfileList();
    } else {
        alert("Wrong password. Please specify the password you used when initially syncing your data");
    }
}

function clearSyncData() {
    Settings.clearSyncData(function(success) {
        if (success) {
            Settings.setSyncProfiles(false);
            updateSyncProfiles();
            updateProfileList();
        }
    });
}

function updateSyncProfiles() {
    $("#sync_profiles_row, #no_sync_password, #sync_data_exists, #sync_password_set").hide();
    $("#set_sync_password, #clear_sync_data").css("visibility", "hidden");

    var should_sync = $("#syncProfiles").prop("checked");
    if (should_sync) {
        if (Settings.syncPasswordOk) {
            $("#sync_password_set").show();
            $("#clear_sync_data").css("visibility", "visible");
        } else if (Settings.syncDataAvailable) {
            $("#sync_profiles_row, #sync_data_exists").show();
            $("#set_sync_password, #clear_sync_data").css("visibility", "visible");
        } else {
            $("#sync_profiles_row, #no_sync_password").show();
            $("#set_sync_password").css("visibility", "visible");
        }
    } else {
        Settings.stopSync();
        updateProfileList();
    }
}

function updateMasterHash() {
    var should_keep = $("#keepMasterPasswordHash").prop("checked");
    if (should_keep) {
        $("#master_password_row").css("visibility", "visible");
        var master_pass = $("#masterPassword").val();
        if (master_pass.length > 0) {
            var new_hash = ChromePasswordMaker_SecureHash.make_hash(master_pass);
            Settings.setKeepMasterPasswordHash(should_keep);
            Settings.setMasterPasswordHash(new_hash);
        } else {
            Settings.setKeepMasterPasswordHash(false);
            Settings.setMasterPasswordHash("");
        }
    } else {
        $("#master_password_row").css("visibility", "hidden");
        $("#masterPassword").val("")
        Settings.setKeepMasterPasswordHash(should_keep);
        Settings.setMasterPasswordHash("");
    }
}

function updateHidePassword() {
    Settings.setHidePassword($("#hidePassword").prop("checked"));
}

function updateDisablePasswordSaving() {
    Settings.setDisablePasswordSaving($("#disablePasswordSaving").prop("checked"));
}

function updateUseVerificationCode() {
    Settings.setUseVerificationCode($("#useVerificationCode").prop("checked"));
}

function testPasswordLength() {
    if (this.value < 8) this.value = 8;
    if (this.value > 512) this.value = 512;
}

function fileImport() {
    var file = $("#fileInput")[0].files[0];
    if (file.type.match(/rdf|xml|text/)) {
        var reader = new FileReader();
        reader.onload = function() {
            $("#importText").val(reader.result);
        };
        reader.readAsBinaryString(file);
    } else {
        $("#importText").val("Please select a supported filetype!");
    }
}

function fileExport() {
    var textFileAsBlob = new Blob([$("#exportText").val()], {type: "application/rdf+xml"});
    var downloadLink = document.createElement("a");
    downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
    downloadLink.download = "PasswordMaker Pro Profile Data.rdf";
    downloadLink.click();
}

$(function() {
    updateProfileList();
    setCurrentProfile(Settings.getProfiles()[0]);

    $("#hidePassword").prop("checked", Settings.shouldHidePassword());
    $("#disablePasswordSaving").prop("checked", Settings.shouldDisablePasswordSaving());
    $("#keepMasterPasswordHash").prop("checked", Settings.keepMasterPasswordHash());
    $("#useVerificationCode").prop("checked", Settings.useVerificationCode());

    if (Settings.keepMasterPasswordHash()) {
        $("#master_password_row").css("visibility", "visible");
    } else {
        $("#master_password_row").css("visibility", "hidden");
    }

    $("#syncProfiles").prop("checked", Settings.shouldSyncProfiles());
    updateSyncProfiles();

    $("#profile_list").on("click", ".link", editProfile);
    $("#add").on("click", addProfile);
    $("#showImport").on("click", showImport);
    $("#showExport").on("click", showExport);
    $("#showSettings").on("click", showOptions);
    $("#showInformation").on("click", showInformation);

    $("#protocolCB").on("change", updateExample);
    $("#subdomainCB").on("click", updateExample);
    $("#domainCB").on("click", updateExample);
    $("#pathCB").on("click", updateExample);
    $("#whereLeetLB").on("change", updateLeet);

    $("#cloneProfileButton").on("click", cloneProfile);
    $("#remove").on("click", removeProfile);
    $("#save").on("click", saveProfile);
    $("#importButton").on("click", importRdf);
    $("#fileInput").on("change", fileImport);
    $("#copyButton").on("click", copyRdfExport);
    $("#exportFileButton").on("click", fileExport);

    $("#hidePassword").on("change", updateHidePassword);
    $("#disablePasswordSaving").on("change", updateDisablePasswordSaving);
    $("#keepMasterPasswordHash").on("change", updateMasterHash);
    $("#syncProfiles").on("change", updateSyncProfiles);
    $("#masterPassword").on("keyup", updateMasterHash);
    $("#useVerificationCode").on("change", updateUseVerificationCode);
    $("#set_sync_password").on("click", setSyncPassword);
    $("#clear_sync_data").on("click", clearSyncData);

    $("#passwdLength").on("blur", testPasswordLength);
});
