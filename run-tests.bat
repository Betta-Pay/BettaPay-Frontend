@echo off
set PATH=%CD%\node_modules\.bin;%PATH%
npx jest --passWithNoTests > test-output.txt 2>&1
if %errorlevel%==0 (
  echo TEST_SUCCESS >> test-output.txt
) else (
  echo TEST_FAILED >> test-output.txt
)
