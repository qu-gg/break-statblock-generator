var data;

var mon = {
    name: "Adversary",
    size: "medium",
    type: "",
    hearts: 1,
    defenseRating: 10,
    speed: "Average",
    attackBonus: 0,
    mgtPoints: 6,
    dftPoints: 6,
    grtPoints: 6,
    insPoints: 6,
    aurPoints: 6,
    abilities: [],
    actions: [],
    languages: [],
    separationPoint: 1
};

const LEGACY_MARKDOWN = false
const V3_MARKDOWN = true

// View as image function
function TryImage() {
    domtoimage.toBlob(document.getElementById("stat-block"))
        .then(function (blob) {
            window.saveAs(blob, mon.name.toLowerCase() + ".png");
        });
}

// Update the main stat block from form variables
function UpdateBlockFromVariables(moveSeparationPoint) {
    GetVariablesFunctions.GetAllVariables();
    UpdateStatblock(moveSeparationPoint);
}


// Update the main stat block
function UpdateStatblock(moveSeparationPoint) {
    // Set Separation Point
    let separationMax = mon.abilities.length + mon.actions.length - 1;

    if (mon.separationPoint == undefined)
        mon.separationPoint = Math.floor(separationMax / 2);

    if (moveSeparationPoint != undefined)
        mon.separationPoint = MathFunctions.Clamp(mon.separationPoint + moveSeparationPoint, 0, separationMax);

    // One column or two columns
    let statBlock = $("#stat-block");
    statBlock.removeClass('wide');

    // Name and type
    $("#monster-name").html(StringFunctions.RemoveHtmlTags(mon.name));
    $("#monster-type").html(StringFunctions.StringCapitalize(StringFunctions.RemoveHtmlTags(mon.size) + ", " + mon.type +
        (mon.tag == "" ? ", " : " (" + mon.tag + ")")));

    // Armor Class
    $("#attack-bonus").html(StringFunctions.FormatString(StringFunctions.RemoveHtmlTags(StringFunctions.GetAttackBonus())));

    // Armor Class
    $("#defense-rating").html(StringFunctions.FormatString(StringFunctions.RemoveHtmlTags(StringFunctions.GetDefenseRating())));

    // Hit Points
    $("#hearts").html(StringFunctions.FormatString(StringFunctions.RemoveHtmlTags(StringFunctions.GetHP())));

    // Speed
    $("#speed").html(StringFunctions.FormatString(StringFunctions.RemoveHtmlTags(StringFunctions.GetSpeed())));

    // Stats
    let setPts = (id, pts) =>
        $(id).html(pts);
    setPts("#mgtpts", mon.mgtPoints);
    setPts("#dftpts", mon.dftPoints);
    setPts("#grtpts", mon.grtPoints);
    setPts("#inspts", mon.insPoints);
    setPts("#aurpts", mon.aurPoints);


    let propertiesDisplayArr = StringFunctions.GetPropertiesDisplayArr();

    // Display All Properties (except CR)
    let propertiesDisplayList = [];
    propertiesDisplayList.push(StringFunctions.MakePropertyHTML(propertiesDisplayArr[0], true));
    for (let index = 1; index < propertiesDisplayArr.length; index++)
        propertiesDisplayList.push(StringFunctions.MakePropertyHTML(propertiesDisplayArr[index]));
    $("#properties-list").html(propertiesDisplayList.join(""));

    // Abilities
    let traitsHTML = [];
    if (mon.abilities.length > 0) AddToTraitList(traitsHTML, mon.abilities);
    if (mon.actions.length > 0) AddToTraitList(traitsHTML, mon.actions, "<h3>Abilities</h3>");

    // Add traits, taking into account the width of the block (one column or two columns)
    let leftTraitsArr = [],
        rightTraitsArr = [],
        separationCounter = 0;
    for (let index = 0; index < traitsHTML.length; index++) {
        let trait = traitsHTML[index],
            raiseCounter = true;
        if (trait[0] == "*") {
            raiseCounter = false;
            trait = trait.substr(1);
        }
        (separationCounter < mon.separationPoint ? leftTraitsArr : rightTraitsArr).push(trait);
        if (raiseCounter)
            separationCounter++;
    }
    $("#traits-list-left").html(leftTraitsArr.join(""));
    $("#traits-list-right").html(rightTraitsArr.join(""));

    // Show or hide the separator input depending on how many columns there are
    FormFunctions.ShowHideSeparatorInput();
}

// Function used by UpdateStatblock for abilities
function AddToTraitList(traitsHTML, traitsArr, addElements, isLegendary = false, isLairRegional = false) {

    // Add specific elements to the beginning of the array, usually a header
    if (addElements != undefined) {
        if (Array.isArray(addElements)) {
            for (let index = 0; index < addElements.length; index++)
                traitsHTML.push("*" + addElements[index]);
        } else
            traitsHTML.push("*" + addElements);
    }

    // There's a small difference in formatting for legendary actions and lair/regional actions
    for (let index = 0; index < traitsArr.length; index++) {
        traitsHTML.push(StringFunctions.MakeTraitHTML(traitsArr[index].name, ReplaceTags(traitsArr[index].desc)));
    }
}

function ReplaceTags(desc) {
    const bracketExp = /\[(.*?)\]/g,
        damageExp = /\d*d\d+/,
        bonusExp = /^[+-] ?(\d+)$/;
    let matches = [],
        match = null;
    while ((match = bracketExp.exec(desc)) != null)
        matches.push(match);

    matches.forEach(function (match) {
        const GetPoints = (pts) => data.statNames.includes(pts) ? MathFunctions.PointsToBonus(mon[pts + "Points"]) : null;
        let readString = match[1].toLowerCase().replace(/ +/g, ' ').trim();

        if (readString.length > 0) {
            if (readString == "mon") {
                if (mon.shortName && mon.shortName.length > 0)
                    desc = desc.replace(match[0], mon.shortName);
                else
                    desc = desc.replace(match[0], mon.name);
            }
            else if (readString == "mons") {
                if (mon.pluralName && mon.pluralName.length > 0)
                    desc = desc.replace(match[0], mon.pluralName);
                else
                    desc = desc.replace(match[0], mon.name);
            }
            else {
                let readPosition = 0,
                    type = null,
                    statPoints = GetPoints(readString.substring(0, 3)),
                    bonus = 0,
                    roll = null;

                // Get roll
                if ((type == null || type == "stat") && readPosition < readString.length) {
                    let nextSpace = readString.indexOf(" ", readPosition),
                        nextToken = nextSpace >= 0 ? readString.substring(readPosition, nextSpace) : readString.substring(readPosition);

                    if (damageExp.test(nextToken)) {
                        roll = nextToken;
                        readPosition += nextToken.length;
                        type = "dmg";

                        if (readPosition < readString.length) {
                            if (readString[readPosition] == " ")
                                readPosition++;
                            else
                                type = "error";
                        }
                    }
                }

                // Get bonus
                if (type != "error" && readPosition < readString.length) {
                    let nextToken = readString.substring(readPosition),
                        bonusMatch = nextToken.match(bonusExp);
                    if (bonusMatch)
                        bonus += nextToken[0] == "-" ? -parseInt(bonusMatch[1]) : parseInt(bonusMatch[1]);
                    else
                        type = "error";
                }

                // Make the string
                if (type != null && type != "error") {
                    let replaceString = null;
                    switch (type) {
                        case "stat":
                        case "atk":
                            replaceString = StringFunctions.BonusFormat(bonus);
                            break;
                        case "save":
                            replaceString = bonus;
                            break;
                        case "dmg":
                            let splitRoll = roll.split("d"),
                                multiplier = splitRoll[0].length > 0 ? parseInt(splitRoll[0]) : 1,
                                dieSize = parseInt(splitRoll[1]);
                            replaceString = Math.max(Math.floor(multiplier * ((dieSize + 1) / 2) + bonus), 1) + " (" + multiplier + "d" + dieSize;
                            replaceString += bonus > 0 ?
                                " + " + bonus : bonus < 0 ?
                                    " - " + -bonus : "";
                            replaceString += ")";
                            break;
                    }
                    desc = desc.replace(match[0], replaceString);
                }
            }
        }
    });

    return desc;
}


// Functions for form-setting
var FormFunctions = {
    // Set the forms
    SetForms: function () {
        // Name and type
        $("#name-input").val(mon.name);
        $("#size-input").val(mon.size);
        $("#type-input").val(mon.type);

        // Armor Class
        $("#defense-rating").val(mon.defenseRating);

        // Hit Dice
        $("#hearts-input").val(mon.hearts);

        // Speeds
        $("#speed-input").val(mon.speed);

        // Stats
        this.SetStatForm("mgt", mon.mgtPoints);
        this.SetStatForm("dft", mon.dftPoints);
        this.SetStatForm("grt", mon.grtPoints);
        this.SetStatForm("ins", mon.insPoints);
        this.SetStatForm("aura", mon.aurPoints);

        // Properties
        this.MakeDisplayList("languages", false);
        this.ShowHideLanguageOther();

        // Abilities
        this.MakeDisplayList("abilities", false, true);
        this.MakeDisplayList("actions", false, true);
    },

    // Show/Hide form options to make it less overwhelming - only call these from SetForms or HTML elements
    ShowHideHtmlElement: function (element, show) {
        show ? $(element).show() : $(element).hide();
    },

    ShowHideFormatHelper: function () {
        this.ShowHideHtmlElement("#format-helper", $("#format-helper-checkbox:checked").val())
    },

    ShowHideLanguageOther: function () {
        this.ShowHideHtmlElement("#other-language-input", $("#languages-input").val() == "*");
    },

    ShowHideSeparatorInput: function () {
        this.ShowHideHtmlElement("#left-separator-button", mon.doubleColumns);
        this.ShowHideHtmlElement("#right-separator-button", mon.doubleColumns);
    },

    SetCommonAbilitiesDropdown: function () {
        $("#common-ability-input").html("");
        for (let index = 0; index < data.commonAbilities.length; index++)
            $("#common-ability-input").append("<option value='" + index + "'>" + data.commonAbilities[index].name + "</option>");
    },

    // Set ability scores and bonuses
    SetStatForm: function (statName, statPoints) {
        $("#" + statName + "-input").val(statPoints);
    },

    // Make a list of removable items and add it to the editor
    MakeDisplayList: function (arrName, capitalize, isBlock = false) {
        if (typeof mon[arrName] == 'undefined')
            mon[arrName] = [];
        let arr = (arrName == "damage" ? mon.damagetypes.concat(mon.specialdamage) : mon[arrName]),
            displayArr = [],
            content = "",
            arrElement = "#" + arrName + "-input-list";
        for (let index = 0; index < arr.length; index++) {
            let element = arr[index],
                elementName = capitalize ? StringFunctions.StringCapitalize(element.name) : element.name,
                note = element.hasOwnProperty("note") ? element.note : "";

            if (arrName == "languages") {
                content = "<b>" + StringFunctions.FormatString(elementName + note, false) + (element.speaks || element.speaks == undefined ? "" : " (understands)") + "</b>";
            }
            else
                content = "<b>" + StringFunctions.FormatString(elementName + note, false) + (element.hasOwnProperty("desc") ?
                    ":</b> " + StringFunctions.FormatString(element.desc, isBlock) : "</b>");

            let functionArgs = arrName + "\", " + index + ", " + capitalize + ", " + isBlock,
                imageHTML = "<img class='statblock-image' src='dndimages/x-icon.png' alt='Remove' title='Remove' onclick='FormFunctions.RemoveDisplayListItem(\"" + functionArgs + ")'>";
            if (isBlock)
                imageHTML += " <img class='statblock-image' src='dndimages/edit-icon.png' alt='Edit' title='Edit' onclick='FormFunctions.EditDisplayListItem(\"" + functionArgs + ")'>" +
                    " <img class='statblock-image' src='dndimages/up-icon.png' alt='Up' title='Up' onclick='FormFunctions.SwapDisplayListItem(\"" + arrName + "\", " + index + ", -1)'>" +
                    " <img class='statblock-image' src='dndimages/down-icon.png' alt='Down' title='Down' onclick='FormFunctions.SwapDisplayListItem(\"" + arrName + "\", " + index + ", 1)'>";
            displayArr.push("<li> " + imageHTML + " " + content + "</li>");
        }
        $(arrElement).html(displayArr.join(""));

        $(arrElement).parent()[arr.length == 0 ? "hide" : "show"]();
    },

    // Remove an item from a display list and update it
    RemoveDisplayListItem: function (arrName, index, capitalize, isBlock) {
        let arr;
        if (arrName == "damage") {
            if (mon.damagetypes.length - index > 0)
                arr = mon.damagetypes;
            else {
                index -= mon.damagetypes.length;
                arr = mon.specialdamage;
            }
        } else
            arr = mon[arrName];
        arr.splice(index, 1);
        this.MakeDisplayList(arrName, capitalize, isBlock);
    },

    // Bring an item into the abilities textbox for editing
    EditDisplayListItem: function (arrName, index, capitalize) {
        let item = mon[arrName][index];
        $("#abilities-name-input").val(item.name);
        $("#abilities-desc-input").val(item.desc);
    },

    // Change position
    SwapDisplayListItem: function (arrName, index, swap) {
        arr = mon[arrName];
        if (index + swap < 0 || index + swap >= arr.length) return;
        let temp = arr[index + swap];
        arr[index + swap] = arr[index];
        arr[index] = temp;
        this.MakeDisplayList(arrName, false, true);
    },

    // Initialize Forms
    InitForms: function () {
        
    }
}

// Input functions to be called only through HTML
var InputFunctions = {
    AddLanguageInput: function (speaks) {
        // Insert alphabetically
        GetVariablesFunctions.AddLanguage($("#languages-input").val(), speaks);

        // Display
        FormFunctions.MakeDisplayList("languages", false);
    },

    AddAbilityInput: function (arrName) {
        let abilityName = $("#abilities-name-input").val().trim(),
            abilityDesc = $("#abilities-desc-input").val().trim();

        if (abilityName.length == 0 || abilityDesc.length == 0)
            return;

        // Insert at end, or replace ability if it exists already
        GetVariablesFunctions.AddAbility(arrName, abilityName, abilityDesc, true);

        // Display
        FormFunctions.MakeDisplayList(arrName, false, true);

        // Clear forms
        $("#abilities-name-input").val("");
        $("#abilities-desc-input").val("");
    },

    AddCommonAbilityInput: function () {
        let commonAbility = data.commonAbilities[$("#common-ability-input").val()];
        if (commonAbility.desc) {
            $("#abilities-name-input").val(commonAbility.hasOwnProperty("realname") ? commonAbility.realname : commonAbility.name);
            $("#abilities-desc-input").val(commonAbility.desc);
            //$("#abilities-desc-input").val(StringFunctions.StringReplaceAll(commonAbility.desc, "[MON]", mon.name.toLowerCase()));
        }
    }
}

// Functions to get/set important variables
var GetVariablesFunctions = {
    // Get all Variables from forms
    GetAllVariables: function () {
        // Name and Type
        mon.name = $("#name-input").val().trim();
        mon.size = $("#size-input").val().toLowerCase();
        mon.type = $("#type-input").val();

        // Armor Class
        mon.defenseRating = $("#defenserating-input").val();

        // Hit Points
        mon.hearts = $("#hearts-input").val();

        // Speeds
        mon.speed = $("#speed-input").val();

        // Stats	
        mon.mgtPoints = $("#mgt-input").val();
        mon.dftPoints = $("#dft-input").val();
        mon.grtPoints = $("#grt-input").val();
        mon.insPoints = $("#ins-input").val();
        mon.aurPoints = $("#aur-input").val();

    },

    AddLanguage: function (languageName, speaks) {
        if (languageName == "") return;
        if (mon.languages.length > 0) {
            if (languageName.toLowerCase() == "all" || mon.languages[0].name.toLowerCase() == "all")
                mon.languages = [];
        }
        ArrayFunctions.ArrayInsert(mon.languages, {
            "name": languageName.trim(),
        }, true);
    },


    // Add abilities, actions, bonus actions, reactions, legendary actions, etc
    AddAbility: function (arrName, abilityName, abilityDesc) {
        let arr = mon[arrName];
        ArrayFunctions.ArrayInsert(arr, {
            "name": abilityName.trim(),
            "desc": abilityDesc.trim()
        }, false);
    },

    AddAbilityPreset: function (arrName, ability) {
        let abilityName = ability.name.trim(),
            abilityDesc = ability.desc;
        if (Array.isArray(abilityDesc))
            abilityDesc = abilityDesc.join("\n");
        abilityDesc = abilityDesc.trim();

        // In case of spellcasting
        if (arrName == "abilities" && abilityName.toLowerCase().includes("spellcasting") && abilityDesc.includes("\n")) {
            abilityDesc = abilityDesc.split("\u2022").join(""), // Remove bullet points
                spellcastingAbility =
                abilityDesc.toLowerCase().includes("intelligence") ? "INT" :
                    abilityDesc.toLowerCase().includes("wisdom") ? "WIS" :
                        abilityDesc.toLowerCase().includes("charisma") ? "CHA" : null;

            if (spellcastingAbility != null) {
                abilityDesc = abilityDesc
                    .replace(/DC \d+/g.exec(abilityDesc), "DC [" + spellcastingAbility + " SAVE]")
                    .replace(/[\+\-]\d+ to hit/g.exec(abilityDesc), "[" + spellcastingAbility + " ATK] to hit");
            }

            // For hag covens
            let postDesc = "";
            if (abilityName.toLowerCase().includes("shared spellcasting")) {
                let lastLineBreak = abilityDesc.lastIndexOf("\n\n");
                postDesc = abilityDesc.substr(lastLineBreak).trim();
                abilityDesc = abilityDesc.substring(0, lastLineBreak);
            }

            let firstLineBreak = abilityDesc.indexOf("\n");
            spellcastingDesc = abilityDesc.substr(0, firstLineBreak).trim();
            spellcastingSpells = abilityDesc.substr(firstLineBreak).trim();

            spellsArr = spellcastingSpells.split("\n");
            for (let index = 0; index < spellsArr.length; index++) {
                let string = spellsArr[index],
                    splitString = string.split(":");
                if (splitString.length < 2) continue;
                let newString = splitString[1];
                newString = StringFunctions.StringReplaceAll(newString, "(", "_(");
                newString = StringFunctions.StringReplaceAll(newString, ")", ")_");

                spellsArr[index] = " " + splitString[0].trim() + ": _" + newString.trim() + "_";
            }

            spellcastingSpells = spellsArr.join("\n>");

            abilityDesc = spellcastingDesc + "\n\n\n>" + spellcastingSpells;

            // For hag covens
            if (postDesc.length > 0)
                abilityDesc += "\n\n" + postDesc;
        }

        // In case of attacks
        if (arrName == "actions" && abilityDesc.toLowerCase().includes("attack")) {
            // Italicize the correct parts of attack-type actions
            let lowercaseDesc = abilityDesc.toLowerCase();
            for (let index = 0; index < data.attackTypes.length; index++) {
                let attackType = data.attackTypes[index];
                if (lowercaseDesc.includes(attackType)) {
                    let indexOfStart = lowercaseDesc.indexOf(attackType),
                        indexOfHit = lowercaseDesc.indexOf("hit:");
                    if (indexOfStart != 0) break;
                    abilityDesc = "_" + abilityDesc.slice(0, attackType.length) + "_" + abilityDesc.slice(attackType.length, indexOfHit) + "_" + abilityDesc.slice(indexOfHit, indexOfHit + 4) + "_" + abilityDesc.slice(indexOfHit + 4);
                    break;
                }
            }
        }

        if (abilityName.length != 0 && abilityDesc.length != 0)
            this.AddAbility(arrName, abilityName, abilityDesc);
    },
}

// Functions that return a string
var StringFunctions = {
    // Add a + if the ability bonus is non-negative
    BonusFormat: (stat) => stat >= 0 ? "+" + stat : stat,

    // Get the string displayed for the monster's AC
    GetAttackBonus: function () {
        return "" + mon.attackBonus + "";
    },

    // Get the string displayed for the monster's AC
    GetDefenseRating: function () {
        return "" + mon.defenseRating + "";
    },

    // Get the string displayed for the monster's HP
    GetHP: function () {
        return "" + mon.hearts + "";
    },

    GetSpeed: function () {
        return mon.speed;
    },

    GetPropertiesDisplayArr: function () {
        // Properties
        let propertiesDisplayArr = [],
            languageDisplayArr = []

        // Languages
        let speaksLanguages = [];
        for (let index = 0; index < mon.languages.length; index++) {
            let language = mon.languages[index];
            speaksLanguages.push(language);
        }
        for (let index = 0; index < speaksLanguages.length; index++)
            languageDisplayArr.push(speaksLanguages[index].name);

        if (languageDisplayArr.length == 0)
            languageDisplayArr.push("&mdash;");

        // Add all that to the array
        let pushArr = (name, arr) => {
            if (arr.length > 0) propertiesDisplayArr.push({
                "name": name,
                "arr": arr
            })
        };
        pushArr("Languages", languageDisplayArr);

        return propertiesDisplayArr;
    },

    // Add italics, indents, and newlines
    FormatString: function (string, isBlock) {
        if (typeof string != "string")
            return string;

        // Complicated regex stuff to add indents
        if (isBlock) {
            let execArr, newlineArr = [],
                regExp = new RegExp("(\r\n|\r|\n)+", "g");
            while ((execArr = regExp.exec(string)) !== null)
                newlineArr.push(execArr);
            let index = newlineArr.length - 1;
            while (index >= 0) {
                let newlineString = newlineArr[index],
                    reverseIndent = (string[newlineString.index + newlineString[0].length] == ">");

                string = this.StringSplice(string, newlineString.index, newlineString[0].length + (reverseIndent ? 1 : 0),
                    "</div>" + (newlineString[0].length > 1 ? "<br>" : "") + (reverseIndent ? "<div class='reverse-indent'>" : "<div class='indent'>"));

                index--;
            }
        }

        // Italics and bold
        string = this.FormatStringHelper(string, "_", "<i>", "</i>")
        string = this.FormatStringHelper(string, "**", "<b>", "</b>")
        return string;
    },

    // FormatString helper function
    FormatStringHelper: function (string, target, startTag, endTag) {
        while (string.includes(target)) {
            let startIndex = string.indexOf(target);
            string = this.StringSplice(string, startIndex, target.length, startTag);
            let endIndex = string.indexOf(target, startIndex + target.length);
            if (endIndex < 0)
                return string + endTag;
            string = this.StringSplice(string, endIndex, target.length, endTag);
        }
        return string;
    },

    // HTML strings

    MakePropertyHTML: function (property, firstLine) {
        if (property.arr.length == 0) return "";
        let htmlClass = firstLine ? "property-line first" : "property-line",
            arr = Array.isArray(property.arr) ? property.arr.join(", ") : property.arr;
        return "<div class=\"" + htmlClass + "\"><div><h4>" + StringFunctions.RemoveHtmlTags(property.name) + "</h4> <p>" + StringFunctions.RemoveHtmlTags(this.FormatString(arr, false)) + "</p></div></div><!-- property line -->"
    },

    MakeTraitHTML: function (name, description) {
        return "<div class=\"property-block\"><div><h4>" + StringFunctions.RemoveHtmlTags(name) + ".</h4><p> " + this.FormatString(StringFunctions.RemoveHtmlTags(description), true) + "</p></div></div> <!-- property block -->";
    },

    // General string operations

    ConcatUnlessEmpty(item1, item2, joinString = ", ") {
        return item1.length > 0 ?
            item2.length > 0 ? item1 + joinString + item2 :
                item1 : item2.length > 0 ? item2 : "";
    },

    StringSplice: (string, index, remove, insert = "") => string.slice(0, index) + insert + string.slice(index + remove),

    StringReplaceAll: (string, find, replacement) => string.split(find).join(replacement),

    StringCapitalize: (string) => string[0].toUpperCase() + string.substr(1),

    GetNumbersOnly: (string) => parseInt(string.replace(/\D/g, '')),

    RemoveHtmlTags(string) {
        if (typeof (string) != "string")
            return string;
        return StringFunctions.StringReplaceAll(string, '<', "&lt;")
    }
}

// Math functions
var MathFunctions = {
    Clamp: (num, min, max) => Math.min(Math.max(num, min), max),

    // Compute ability bonuses based on ability scores
    PointsToBonus: (points) => Math.floor(points / 2) - 5,

}

// Array functions
var ArrayFunctions = {
    ArrayInsert: function (arr, element, alphabetSort) {
        let lowercaseElement = element.name.toLowerCase();
        for (let index = 0; index < arr.length; index++) {
            let lowercaseIndex = arr[index].name.toLowerCase();
            if (alphabetSort && lowercaseIndex > lowercaseElement) {
                arr.splice(index, 0, element)
                return;
            }
            if (lowercaseIndex == lowercaseElement) {
                arr.splice(index, 1, element)
                return;
            }
        }
        arr.push(element);
    },

    FindInList: function (arr, name) {
        let lowercaseName = name.toLowerCase();
        for (let index = 0; index < arr.length; index++) {
            if (arr[index].name.toLowerCase() == lowercaseName)
                return arr[index];
        }
        return null;
    },

    // Take a string representing an array from a preset and turn it into a normal array
    FixPresetArray: function (string) {
        let arr = string.split(","),
            returnArr = [];
        for (let index = 0; index < arr.length; index++) {
            let name = arr[index].trim();
            if (name.length > 0)
                returnArr.push(name);
        }
        return returnArr;
    }
}

// Document ready function
$(function () {
    // Load the json data
    $.getJSON("js/JSON/statblockdata.json", function (json) {
        data = json;

        Populate();
    });

    FormFunctions.ShowHideFormatHelper();
});

function Populate() {
    FormFunctions.SetCommonAbilitiesDropdown();

    // Populate the stat block
    FormFunctions.InitForms();
    FormFunctions.SetForms();
    UpdateStatblock();
}