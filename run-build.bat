@echo off
set PATH=%CD%\node_modules\.bin;%PATH%
npx next build > build-output.txt 2>&1
if %errorlevel%==0 (
  echo BUILD_SUCCESS >> build-output.txt
) else (
  echo BUILD_FAILED >> build-output.txt
)
