const moment = require("moment");

exports.generateCode = () => {
     return Math.floor(1000 + Math.random() * 9000).toString();
}
exports.ticketCode = () => {
     return Math.floor(100000000000 + Math.random() * 900000000000).toString();
}


exports.generateRandomString = (length) => {
     const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
     let randomString = '';

     for (let i = 0; i < length; i++) {
          const randomIndex = Math.floor(Math.random() * characters.length);
          randomString += characters.charAt(randomIndex);
     }

     return randomString;
}
exports.generateTXIDString = () => {
     const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
     let randomString = '';

     for (let i = 0; i < 3; i++) {
          const randomIndex = Math.floor(Math.random() * characters.length);
          randomString += characters.charAt(randomIndex);
     }

     return randomString+(Math.floor(10000 + Math.random() * 90000).toString());
}


exports.convertLabels=(label,date)=>{
     switch (label) {
         case 'daily':
            return moment(date).format('hh:mm A')
           break;
         case 'weekly':
             return moment(date).format('ddd');
           break;
         case 'monthly':
             return  moment(date).format('MM/DD/YYYY');
           break;
         case 'quarterly':
             return moment(date).format('MM/DD/YYYY');
           break;
         case 'sixmonth':
             return  moment(date).format('MM/DD/YYYY');
           break;
         case 'yearly':
             return  moment(date).format('MMM');
           break;
       
         default:  
         return moment(date).format('MM/DD/YYYY');  
           break;
       }
 }