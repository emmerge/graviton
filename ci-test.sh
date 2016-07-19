#!/usr/bin/env bash

echo Graviton 1.0.0+ - testing using meteor 1.3 test-packages + mocha - not old tinytest
meteor test-packages ./ --once --driver-package dispatch:mocha-phantomjs
