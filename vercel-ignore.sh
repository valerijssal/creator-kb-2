#!/bin/bash
git diff HEAD^ HEAD --name-only | grep -qvE '^public/(tree|titles|access|order)\.json$'
