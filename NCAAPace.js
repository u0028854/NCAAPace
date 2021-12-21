const fs = require('fs');
const cheerio = require('cheerio');
const got = require('got');
const path = require('path');
const fileName = path.resolve('C:\\Users\\Corey\\Desktop\\', 'NCAAPace.csv');

let url= 'http://www.cfbstats.com/2021/leader/national/team/offense/split01/category10/sort01.html';

got(url).then(response => {
    let teamData = new Map();
    let webPage = cheerio.load(response.body);

    let teamRows = webPage('td.team-name').parent();

    for (let x = 0; x < teamRows.length; x++){
        let temp = new TeamData(teamRows[x].children[3].children[0].children[0].data, teamRows[x].children[11].children[0].data);
        teamData.set(temp.teamName, temp);
    }

    url = 'http://www.cfbstats.com/2021/leader/national/team/offense/split01/category15/sort01.html';

    got(url).then(response => {
        webPage = cheerio.load(response.body);

        teamRows = webPage('td.team-name').parent();

        for (let x = 0; x < teamRows.length; x++){
            let tempTeam = teamData.get(teamRows[x].children[3].children[0].children[0].data);
            tempTeam.timeOfPossession = calculateSeconds(teamRows[x].children[7].children[0].data);
            teamData.set(tempTeam.teamName, tempTeam);
        }

        fs.writeFileSync(fileName, buildFileOutput(teamData), (err) => {
            if (err) console.log(err);
        });
    });
}).catch(err => {
    console.log(err);
});

function buildFileOutput(teamDataMap){
    let retVal = 'Team Name, Time Per Play\n';

    let iterator = teamDataMap.values();

    let tempIterator = iterator.next();

    while(!tempIterator.done){
        let tempTeam = tempIterator.value;

        retVal += tempTeam.teamFileOutput();

        tempIterator = iterator.next();
    }

    return retVal;
}

function calculateSeconds(timeOfPoss){
    let possTime = timeOfPoss.split(':');

    if(possTime.length == 2){
        return (60 * Number(possTime[0]) + Number(possTime[1]));
    }
    else{
        console.log('Malformed Time of Possession');
    }
}

class TeamData {
    constructor(name, plays){
        this._teamName = name;
        this._timeOfPossession = 0;
        this._totalPlays = plays;
    }

    get teamName(){
        return this._teamName;
    }

    set teamName(x){
        this._teamName = x;
    }
    
    get timeOfPossession(){
        return this._timeOfPossession;
    }

    set timeOfPossession(x){
        this._timeOfPossession = x;
    }

    get totalPlays(){
        return this._totalPlays;
    }

    set totalPlays(x){
        this._totalPlays = x;
    }

    timePerPlay(){
        return Math.round(100* Number(this._timeOfPossession) / Number(this._totalPlays)) / 100;
    }

    teamFileOutput(){
        return this._teamName + ',' + this.timePerPlay() + '\n';
    }
}