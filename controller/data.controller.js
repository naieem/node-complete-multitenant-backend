var dataHandler = require('../handler/data.handler');
module.exports = {
        insert: insert,
        getDataByQuery: getDataByQuery,
        update: update,
        addRelationData: addRelation,
        getRelationData: getRelationData,
        uploadFile: uploadFile,
        getFile: getFile,
        getFeatures: getFeatures
    }
    /**
     * inserting into database
     * @param {*} req 
     * @param {*} res 
     */
function insert(req, res) {
    dataHandler
        .insert(req)
        .then(function(result) {
            res.status(200).send(result);
        })
        .catch(function(error) {
            res.status(500).send(error);
        });
}
/**
 * getting data by query
 * @param {*} req 
 * @param {*} res 
 */
function getDataByQuery(req, res) {
    dataHandler
        .getData(req)
        .then(function(result) {
            res.status(200).send(result);
        })
        .catch(function(error) {
            res.status(500).send(error);
        });
}
/**
 * Updating existing data
 * @param {*} req 
 * @param {*} res 
 */
function update(req, res) {
    dataHandler.update(req).then((response) => {
        res.status(200).send(response);
    }).catch((error) => {
        res.status(500).send(error);
    });
}
/**
 * Adding relations between tables
 * @param {*} req 
 * @param {*} res 
 */
function addRelation(req, res) {
    dataHandler.addRelation(req.body).then((result) => {
        res.status(200).send(result);
    }).catch((error) => {
        res.status(500).send(error);
    });
}
/**
 * getting relational data
 * @param {*} req 
 * @param {*} res 
 */
function getRelationData(req, res) {
    dataHandler.getRelationData(req).then((result) => {
        res.status(200).send(result);
    }).catch((err) => {
        res.status(500).send(err);
    });
}
/**
 * upload fie function handler
 * @param {*} req 
 * @param {*} res 
 */
function uploadFile(req, res) {
    dataHandler.uploadFileHandler(req).then((result) => {
        res.send(result);
    }).catch((err) => {

        res.status(500).send(err);
    });
}
/**
 * Get file function handler
 * @param {*} req 
 * @param {*} res 
 */
function getFile(req, res) {
    dataHandler.getFiles(req).then((result) => {
        res.status(200).send(result);
    }).catch((err) => {
        res.status(500).send(err);
    });
}
/**
 * Get list of navigations
 * @param {*} req 
 * @param {*} res 
 */
function getFeatures(req, res) {
    dataHandler.getFeatures(req).then((result) => {
        res.status(200).send(result);
    }).catch((err) => {
        res.status(200).send(err);
    });
}