'use strict';

var unirest = require("unirest");
var fs = require("fs");

class GameData {
    constructor(){
        this._timeOfPossession = 0;
        this._rushingAttempts = 0;
        this._passingAttempts = 0
    }

    get timeOfPossession(){
        return this._timeOfPossession;
    }

    set timeOfPossession(x){
        this._timeOfPossession = x;
    }

    get rushingAttempts(){
        return this._rushingAttempts;
    }

    set rushingAttempts(x){
        this._rushingAttempts = x;
    }

    get passingAttempts(){
        return this._passingAttempts;
    }

    set passingAttempts(x){
        this._passingAttempts = x;
    }
    
    getTimePerPlay(){
        return parseInt(this._timeOfPossession) / (parseInt(this._rushingAttempts) + parseInt(this._passingAttempts));
    }
}

function TeamData(teamName) {
    this.teamName = teamName.replace("&","%26");
    this.gameData = [];

    this.addGame = function(topString, rushingAttempts, passAttString){
        let tempGame = new GameData();
        
        tempGame.timeOfPossession = this.parsePossession(topString);
        tempGame.rushingAttempts = rushingAttempts;
        tempGame.passingAttempts = this.parsePassingAtts(passAttString);
        
        this.gameData.push(tempGame);
    };

    this.parsePossession = function(topString){
        if(topString === undefined){
            return 0;
        }
        
        var temp = topString.split(":");
        return ((60 * parseInt(temp[0])) + parseInt(temp[1])); 
    };

    this.parsePassingAtts = function(passAttString){
        if(passAttString === undefined){
            return 0;
        }

        return passAttString.split("-")[1];
    };

    this.getAllTimePerPlay = function(){
        let totalPlays = 0;
        let totalTOP = 0;

        for(let i = 0; i < this.gameData.length; i++){
            totalPlays += parseInt(this.gameData[i].rushingAttempts);
            totalPlays += parseInt(this.gameData[i].passingAttempts);
            totalTOP += parseInt(this.gameData[i].timeOfPossession);
        }

        return totalTOP / totalPlays;
    };

    this.formatTimeCSV = function(){
        let retVal = this.teamName + "," + Math.round(100*this.getAllTimePerPlay())/100;
        
        for(let i = 0; i < this.gameData.length; i++){
            retVal += ("," + Math.round(100*this.gameData[i].getTimePerPlay())/100);
        }

        return retVal;
    }
}

var fileName = "NCAAPace.csv";
var season = "2019";
var req = unirest.get("https://api.collegefootballdata.com/teams/fbs?year=" + season);

req.end(function(res) {
    if (res.error) throw new Error(res.error);

    fs.unlink(fileName, function (err) {
        if (err) throw err;
        // if no error, file has been deleted successfully
        
        fs.appendFileSync(fileName, "Team Name, Total Pace, Game 1, Game 2, Game 3, Game 4, Game 5, Game 6, Game 7, Game 8, Game 9, Game 10, Game 11, Game 12" + "\n", (err) => {
            if (err) console.log(err);
        });
    });

    let jsonArray = res.toJSON().body;
    let teamArray = [];

    for (let i = 0; i < jsonArray.length; i++){
        teamArray.push(new TeamData(jsonArray[i].school));
    }

    for(let i = 0; i < teamArray.length; i++){
        let req2 = unirest.get("https://api.collegefootballdata.com/games/teams?year=" + season +
            "&seasonType=regular&team=" + teamArray[i].teamName);
        
        req2.end(function(res2) {
            if (res2.error) throw new Error(res2.error);

            jsonArray = res2.toJSON().body;

            for (let j = 0; j < jsonArray.length; j++){
                let tempTeamJSON = jsonArray[j].teams[0];

                if(tempTeamJSON.school != teamArray[i].teamName){
                    tempTeamJSON = jsonArray[j].teams[1];
                }

                tempTeamJSON = tempTeamJSON.stats;

                let topString;
                let rushingAttempts;
                let passAttString;

                for (let k = 0; k < tempTeamJSON.length; k++){
                    

                    if(tempTeamJSON[k].category === "possessionTime"){
                        topString = tempTeamJSON[k].stat;
                    }
                    else if(tempTeamJSON[k].category === "rushingAttempts"){
                        rushingAttempts = tempTeamJSON[k].stat;
                    }
                    else if(tempTeamJSON[k].category === "completionAttempts"){
                        passAttString = tempTeamJSON[k].stat;
                    }
                }

                teamArray[i].addGame(topString, rushingAttempts, passAttString);
            }

            fs.appendFileSync(fileName, teamArray[i].formatTimeCSV() + "\n", (err) => {
                if (err) console.log(err);
            });
        });
    }
});