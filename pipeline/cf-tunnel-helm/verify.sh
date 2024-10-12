rm -rf ../_output

helm template cf-tunnel ./ --values ./values-dev.yaml --output-dir ../_output --debug
helm lint ./ #--values ./values.yaml

#helm package ./
#helm repo index ./
