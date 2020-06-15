const fetch = require("node-fetch");
const core = require("@actions/core");
const github = require("@actions/github");

const PAT = core.getInput("PAT", { required: true });
const RUN_ID = core.getInput("RUN_ID", { required: true });
const OWNER = github.context.repo.owner;
const REPO = github.context.repo.repo;

const octo = github.getOctokit(PAT);

async function getArtifacts(owner, repo, run_id) {
  let response = await octo.actions.listWorkflowRunArtifacts({
    owner,
    repo,
    run_id,
  });

  if (response.status != 200) {
    throw Error("Failed to retrieve run artifacts. Is RUN_ID set correctly?");
  }

  return response.data.artifacts;
}

async function deleteArtifact(owner, repo, id) {
  return (
    (await octo.actions.deleteArtifact({ owner, repo, artifact_id: id }))
      .status == 204
  );
}

async function main() {  
  let artifacts = await getArtifacts(OWNER, REPO, RUN_ID);

  core.info(`Artifact count ${artifacts.length}`);

  let failed = false;

  for (const artifact of artifacts) {
    console.log(`Attempting to delete artifact - ${artifact.name}`);

    if (await deleteArtifact(OWNER, REPO, artifact.id)) {
      core.info("Artifact deleted");
    } else {
      core.warning("Artifact not deleted retrying");

      // Retry once
      if (await deleteArtifact(OWNER, REPO, artifact.id)) {
        core.info("Artifact deleted");
      } else {
        core.error("Artifact not deleted");
        failed = true;
      }
    }
  }

  if (failed_attempts.length > 0) {
    core.setFailed("Failed to delete all artifacts");
  }
}

try {
  main();
} catch (error) {
  core.setFailed(error.message);
}
