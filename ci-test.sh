#!/usr/bin/env bash

echo Graviton 0.x - testing using node start_test.js
node start_test.js

#echo Graviton 1.x - testing using Velocity
#VELOCITY_TEST_PACKAGES=1 meteor test-packages --port 4000 --driver-package velocity:html-reporter --velocity --release velocity:METEOR@1.2.1_2 ./
