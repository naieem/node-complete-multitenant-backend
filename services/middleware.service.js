var authService = require('./auth.service');
var tokenStorage = require('./tokenStorage.service');
module.exports = {
    validatetoken: validatetoken
}

function validatetoken(req, res, next) {
    if (req.headers && req.headers.authorization) {
        if (!tokenStorage.checkExpiredToken(req.headers.authorization)) {
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