import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';

const GITHUB_OWNER = 'juan1701711109';   // tu usuario personal
const GITHUB_REPO = 'todo-app-cdk';              // nombre del repo

export class PipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new codebuild.Project(this, 'TodoAppBuild', {
      projectName: 'todo-app-build',
      source: codebuild.Source.gitHub({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
      }),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
      },
      // Usa el buildspec.yml del repo (no inline)
      buildSpec: codebuild.BuildSpec.fromSourceFilename('buildspec.yml'),
    });
  }
}