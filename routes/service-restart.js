const express = require('express');
const router = express.Router();
const exec = require('child_process').exec;

/* GET home page. */
router.get('/:podName', function(req, res, next) {

    const processCommandOutput = command => {
        return new Promise((resolve, reject) => {
            exec(command, (e, stdo, stde) => {                
                e ? reject(stde):resolve(stdo);
            });
        });
    }

    const apps = req.params.podName.split(',');
    Promise.all(
        apps.map(appName => 
            processCommandOutput(`kubectl get deployment ${appName} -o yaml | kubectl replace force -f -`)
        )
    ).then(
        result => {res.status(200).json({restart: result})}        
    ).catch(
        e => {res.status(400).json({error: e})},
    )
});

module.exports = router;
