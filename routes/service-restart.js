const express = require('express');
const router = express.Router();
const exec = require('child_process').exec;

/* GET home page. */
router.get('/:podName', function(req, res, next) {
    const command = `kubectl get deployment ${req.params.podName} -o yaml | kubectl replace force -f -`
    exec(command, (e, stdo, stde) => {
        if (e) {
            res.status(400).json({error: stde})
        }
        else {
            res.status(200).json({restart: stdo})
        }
    })
});

module.exports = router;
