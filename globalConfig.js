module.exports = {
    tokenExpiryTime: 50,
    defaultTotalRowCount: 10,
    activationLinkTimeout:60*24, // 1 hr * 24 = 1day
    // localdb: 'mongodb://supto:1qazZAQ!@ds351807.mlab.com:51807/carvault',
    localdb: 'mongodb://localhost:27017/ITSM',
    storageLocation: "./storage/",
    // mailServiceUrl:"http://service-report.com:4000/api/sendMail",
    mailServiceUrl:"http://localhost:4000/api/sendMail"
}