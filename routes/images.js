const express = require("express");
const router = express.Router();
const debug = require("debug")("k8s-autodeploy:services");
const { executeCommand, deployment } = require("../util/commands");
const { commonErrorHandler } = require("../util/errors");

// Restart all deployments that run a specific image
router.post("/:images/rollout", async function (request, response, next) {
  const dockerTag = request.body.push_data.tag;
  const images = request.params.images.split(",");

  debug(
    "NEW rollout request. Images => %s, DockerTag => %s",
    request.params.images,
    dockerTag
  );

  // Gets all deployments running any of the given images separated by space
  // returns string like: "deployment1 image1\ndeployment2 image2\n"
  const command = `kubectl get deployments -o jsonpath="{range .items[*]}{.metadata.name}{' '}{.spec.template.spec.containers[*].image}{'\\n'}{end}"`;

  const { stdout } = await executeCommand("sh", ["-c", command]);
  const deployments = stdout.trim().split("\n");

  response.status(200).json({});

  for (const deploymentInfo of deployments) {
    const [deploymentName, imageName] = deploymentInfo.split(" ");
    if (images.includes(imageName)) {
      try {
        await deployment.rollout(deploymentName);
        debug("Deployment rolled out => %s", deploymentName);
      } catch (error) {
        debug("Error during rollout => %s", error);
      }
    }
  }
});

module.exports = router;
