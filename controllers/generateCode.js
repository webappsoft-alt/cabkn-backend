exports.generateCode = () => {
     return Math.floor(1000 + Math.random() * 9000).toString();
}
exports.ticketCode = () => {
     return Math.floor(10000000 + Math.random() * 90000000).toString();
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

