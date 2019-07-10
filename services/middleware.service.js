var authService = require('./auth.service');
var tokenStorage = require('./tokenStorage.service');
module.exports = {
    validatetoken: validatetoken
}
/**
 * logic behind this.
 * if authorization presents in the header then use that as token.
 * if not then check for cookies.
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
function validatetoken(req, res, next) {
    let token = req.headers && req.headers.authorization ? req.headers.authorization : (req.cookies && req.cookies[req.headers.origin] ? req.cookie[req.headers.origin] : null )
    if (token) {
        if (!tokenStorage.checkExpiredToken(token)) {
            authService
                .validateToken(req.headers.authorization)
                .then(function(result) {
                    req.userInfo = result;
                    next();
                })
                .catch(function(err) {
                    res
                        .status(401)
                        .send({ status: '401', message: 'You are unauthorizeid' });
                });
        } else {
            res
                .status(401)
                .send({ status: '401', message: 'You are unauthorizeid' });
        }
    } else {
        res
            .status(401)
            .send({ status: '401', message: 'You are unauthorizeid' });
    }
}