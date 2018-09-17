# OS Tools

![](https://img.shields.io/badge/node-%3E=8-green.svg)

OS Tools is a support tool for OpenShift users/administrators that allows bulk operations using a regular expression to manage multiple environments.

## Installation

```
$ npm install -g https://github.com/dotdigitalgroup/os-tools
```

## Configuration

```
$ os-tools configure
```

## Usage

### Comparing and updating variables

Throughout the deployment cycle, some namespaces tends to be outdated with the latest variables our application needs in order to function properly. This could lead to unstable or even broken apps. The command below will perform a variable search in the namespaces that matches a regex and get the most complete set of variables (the ones that we have at least one occurrence between all namespaces). Then you can choose what values should be in these missing variables.

```
$ os-tools equalize-env \
  --resource-type build \
  --resource-name my-application \
  --namespace-regex '^project-name-'
```

**Note:** This operation is interactive an will ask for every variable for you to set a value. When all the variables are set, it will then perform the bulk update.

### Updating environment variables

Let's suppose you get fifteen namespaces that matches a regex. With the command below, you can update all these fifteen namespaces at once with the values from `FOO` and `BAR` for the build config named `my-application`.

```
$ os-tools set-env \
  --resource-type build \
  --resource-name my-application \
  --namespace-regex '^project-name-' \
  --variable FOO=1 \
  --variable BAR=2
```

### Running builds and deployments

Builds and deployments of multiple application can be schedulled with this command. You can also change the source reference (tag, branch or commit hash) to your new builds.

```
$ os-tools instantiate \
  --resource-type build \
  --resources-names my-application \
  --resources-names my-new-application \
  --namespace-regex '^project-name-' \
  --source-ref awesome-feature-branch
```

### Updating resources by excerpt

You can update parts of your resource content using a YAML file. In the example below, only the `readinessProbe` node will be updated on all the deployment configs of all namespaces that the `"^project-name-"` regex will retrieve. The `readinessProbe` content will be retrieved from the file `updated-dep-config.yaml`.

```
$ os-tools update-resource \
  --resource-type deployment \
  --resource-name my-application \
  --namespace-regex '^project-name-' \
  --property-path 'spec.template.spec.containers[0].readinessProbe' \
  --filename 'updated-dep-config.yaml'
```