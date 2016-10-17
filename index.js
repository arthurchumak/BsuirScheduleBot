const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const xml = require('pixl-xml');

axios.defaults.baseURL = 'http://www.bsuir.by/schedule/rest';

const TOKEN = process.env.TOKEN || null;

var bot = new TelegramBot(TOKEN, {polling: true});

global.store = {};

// setInterval(function (){
    axios.get('/studentGroup')
    .then(function (response){
        var json = xml.parse(response.data);
        global.store.groups = json.studentGroup;
        console.log('done');
    })
// }, 24 * 60 * 60 * 1000);


function getGroupId(name){
    var group = global.store.groups.find(function (group){
        return (group.name == name) ? true : false;
    });
    return group ? group.id : null;
}

function getWeek(today = new Date()) {
    var onejan = new Date(today.getFullYear(),0,1),
        millisecsInDay = 86400000,
        week = Math.ceil((((today - onejan) /millisecsInDay) + onejan.getDay()+1)/7),
        week_bsuir = (week) % 4 + 1;
    return week_bsuir;
}

function getDay(date = new Date()){
    var RU = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
    return RU[date.getDay() - 1];
}

bot.onText(/\/start/, function (msg) {
    var chatId = msg.chat.id,
        message = "Для получения рассписания на сегодня воспользуйтесь командой /g353502 заменив номер группы на свой.";
    bot.sendMessage(chatId, message);
});
    
bot.onText(/\/g(.+)/, function (msg, match) {
    console.log(match);
    
    var chatId = msg.chat.id;
        
    try{
        var group_id = getGroupId(match[1]);
        if (group_id == null) {
            throw new Error('No such group');
        }
    }
    catch(error){
        console.log(error);
        bot.sendMessage(chatId, 'Ошибочка :)');
        return;
    }
    
    axios.get('/schedule/' + group_id)
    .then(function (response) {
        var days = xml.parse(response.data).scheduleModel,
            today = getDay(),
            week = getWeek(),
            message = today + '\n',
            tab = '        ';
            
        var lessons = days.find(function(day){
            return (day.weekDay === today) ? true : false;
        }).schedule;
    
        for(lesson of lessons){
            var itemWeekNumbers = Array.from(lesson.weekNumber);
            if (itemWeekNumbers.includes("" + week)){
                var subgroup = (lesson.numSubgroup == 0) ? '' : ('\n' + tab + 'Подгруппа ' + lesson.numSubgroup);
                message += lesson.lessonTime + ' ' + lesson.lessonType + ' ' + lesson.subject + subgroup + '\n';
                message += tab + lesson.auditory + ' ' + lesson.employee.lastName + '\n';
            }
        }
        bot.sendMessage(chatId, message);
    })
    .catch(function (error) {
        console.log(error);
        message += tab + "Выходной"
        bot.sendMessage(chatId, message);
    });
    
});