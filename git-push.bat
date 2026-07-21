@echo off

REM Prompt the user to input the commit message
set /p commitMessage=Enter commit message: 

REM Add all changes to staging
git add .

REM Commit with the provided message
git commit -m "%commitMessage%"

REM Push to the master branch
git push origin -u master

REM Notify the user of completion
echo Successfully pushed to GitHub!
pause