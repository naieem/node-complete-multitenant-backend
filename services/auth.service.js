var bcrypt = require("bcryptjs");
var jwt = require("jsonwebtoken");
var globalConfig = require("../globalConfig");
var personModel = require("../tables/core/person.table");
var tokenStorage = require("./tokenStorage.service");
var dataHandler = require('../handler/data.handler');
var secret = "751d88b0-e5e2-4627-90e5-06839eff73b0";
var tokenExpiryTime = globalConfig.tokenExpiryTime * 60; //  minute

module.exports = {
    register: register,
    login: login,
    getLoggedInUserInfo: getLoggedInUserInfo,
    validateToken: validateToken,
    logout: logout,
    getsecurityPermission: getsecurityPermission,
    changesecurityPermission: changesecurityPermission
};

/**
 * registering new user to the database
 * creating user table information first and then adding information to the person table
 * @param {*} userInfo
 * @param {*} personInfo
 */
function register(userInfo, personInfo, request) {
    return new Promise(function(resolve, reject) {
        findUserByEmail(userInfo.username)
            .then(function(response) {
                if (response) {
                    resolve({
                        status: false,
                        message: "user already exists with this username"
                    });
                } else {
                    tables[origin]["user"].create(userInfo, function(err, result) {
                        if (err) reject(err);
                        else {
                            personInfo.tag = "Is-A-Person";
                            let personPayload = {
                                body: {
                                    table: 'person',
                                    data: personInfo
                                },
                                userInfo: request.userInfo
                            }
                            dataHandler.insert(personPayload).then((response) => {
                                resolve({
                                    status: true,
                                    personId: response.itemId
                                });
                            }).catch((err) => {
                                resolve({
                                    status: false,
                                    message: err
                                });
                            });
                            // tables[origin]["person"].create(personInfo, function(
                            //   error,
                            //   personInfo
                            // ) {
                            //   if (error) reject(error);
                            //   else {
                            //     resolve({
                            //       status: true,
                            //       result: personInfo
                            //     });
                            //   }
                            // });
                        }
                    });
                }
            })
            .catch(function(error) {
                reject(error);
            });
    });
}
/**
 * login user according to given criteria
 * @param {*} criteria {username,password}
 */
function login(username, password) {
    var userCriteria = {
        username: username
    };
    return new Promise(function(resolve, reject) {
        tables[origin]["user"].find(userCriteria, function(err, docs) {
            if (err) reject(err);
            if (docs && docs.length) {
                bcrypt.compare(password, docs[0].password, function(errr, res) {
                    if (errr) reject(errr);
                    if (res) {
                        tables[origin]["person"].find({
                                user_id: docs[0]._id
                            },
                            function(error, personData) {
                                if (personData && personData.length) {
                                    resolve({
                                        token: generateToken(personData[0]),
                                        personInfo: personData[0]
                                    });
                                } else {
                                    resolve({
                                        status: false,
                                        message: "no person found with this user"
                                    });
                                }
                            }
                        );
                    } else {
                        resolve({
                            status: false,
                            message: "sorry username or password did not match"
                        });
                    }
                });
            } else {
                resolve({
                    status: false,
                    message: "sorry user found with your given criteria"
                });
            }
        });
    });
}

function generateToken(personData) {
    var payload = {
        personId: personData._id,
        userId: personData.user_id,
        roles: personData.roles
    };
    return jwt.sign(payload, secret, {
        expiresIn: tokenExpiryTime // expires in 5 mins
    });
}
/**
 * find user by username into user table
 * @param {*} username
 */
function findUserByEmail(username) {
    return new Promise(function(resolve, reject) {
        var criteria = {
            username: username
        };
        tables[origin]["user"].find(criteria, function(err, docs) {
            if (err) reject(err);
            if (docs && docs.length) resolve(true);
            resolve(false);
        });
    });
}

/**
 * get logged in users information
 * @param {*} req
 * @param {*} res
 */
function getLoggedInUserInfo(request) {
    return new Promise(function(resolve, reject) {
        validateToken(request.headers.authorization)
            .then(function(result) {
                if (result) {
                    tables[origin]["person"].find({
                            _id: result.personId
                        },
                        function(error, personInfo) {
                            if (error) reject(error);
                            resolve(personInfo[0]);
                        }
                    );
                }
            })
            .catch(function(err) {
                reject({
                    status: false,
                    message: "You are not authorized to see this information"
                });
            });
    });
}

function validateToken(token) {
    return new Promise(function(resolve, reject) {
        jwt.verify(token, secret, function(err, decoded) {
            if (err) reject(err);
            resolve(decoded);
        });
    });
}

function logout(request) {
    return new Promise((resolve, reject) => {
        if (request.headers && request.headers.authorization) {
            tokenStorage.storeExpiredToken(request.headers.authorization);
            resolve({
                status: true,
                message: "logout successfull"
            });
        } else {
            reject({
                status: false
            });
        }
    });
}
/**
 * Get security permission information
 * table,id
 * @param {*} request 
 */
function getsecurityPermission(request) {
    let tablename = request.body.table || null;
    let itemId = request.body.id || null;
    let props = "idsAllowedToRead idsAllowedToWrite idsAllowedToUpdate";
    let query = {
        $or: [{
                rolesAllowedToRead: {
                    $in: request.userInfo.roles
                }
            },
            {
                idsAllowedToRead: {
                    $in: request.userInfo.userId
                }
            }
        ],
        _id: itemId
    };
    return new Promise((resolve, reject) => {
        if (!tableExistencyCheck(tablename)) {
            resolve({
                status: false,
                message: "Sorry table not found"
            });
        } else if (!tablename || !tablename.length) {
            resolve({
                status: false,
                message: "No tablename provided"
            });
        } else if (!itemId) {
            resolve({
                status: false,
                message: "No itemId provided"
            });
        } else {
            tables[origin][tablename].find(query, props, (err, docs) => {

                if (!err) {
                    resolve({
                        status: true,
                        data: docs
                    });
                } else {
                    resolve({
                        status: false,
                        message: err
                    });
                }
            });
        }
    });
}
/**
 * change security permission
 * table,id,data
 * @param {*} request 
 */
function changesecurityPermission(request) {
    let tablename = request.body.table || null;
    let itemId = request.body.id || null;
    let data = request.body.data || null;
    return new Promise((resolve, reject) => {
        if (!tablename || !tablename.length) {
            resolve({
                status: false,
                message: "No tablename provided"
            });
        } else if (!itemId) {
            resolve({
                status: false,
                message: "No itemId provided"
            });
        } else {
            checkPermissionToUpdate(request)
                .then(response => {
                    if (!response) {
                        resolve({
                            status: false,
                            message: "You have no permission to update this data"
                        });
                    } else {
                        tables[origin][tablename].update({ _id: itemId }, data, (err, docs) => {

                            if (!err) {
                                resolve({
                                    status: true,
                                    itemId: itemId,
                                    message: "Security permission updated succesfully"
                                });
                            } else {
                                resolve({
                                    status: false,
                                    message: err
                                });
                            }
                        });
                    }
                })
                .catch(error => {
                    resolve({
                        status: false,
                        message: error
                    });
                });
        }
    });
}
/**
 * checking if quried table exists or not
 * @param {*} table 
 */
function tableExistencyCheck(table) {
    if (tables[origin][table]) {
        return true;
    } else {
        return false;
    }
}
/**
 * check if user has permission to update the data
 * @param {*} request 
 */
function checkPermissionToUpdate(request) {
    return new Promise((resolve, reject) => {
        /**
         * checking if it satisfies rolesAllowedToUpdate or idsAllowedToUpdate
         */
        var query = {
            _id: request.body.id,
            $or: [{
                    rolesAllowedToUpdate: {
                        $in: request.userInfo.roles
                    }
                },
                {
                    idsAllowedToUpdate: {
                        $in: [request.userInfo.userId]
                    }
                }
            ]
        };
        tables[origin][request.body.table].find(query, (err, docs) => {
            if (err) reject(err);
            if (docs && docs.length) {
                resolve(true);
            } else {
                resolve(false);
            }
        });
    });
}