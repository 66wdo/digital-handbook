@echo off
cd /d "%~dp0"
set "GIT_PYTHON_GIT_EXECUTABLE=%~dp0..\runtime\PortableGit\cmd\git.exe"
set "DISABLE_MKDOCS_2_WARNING=true"
set "NO_MKDOCS_2_WARNING=true"
echo ============================================
echo   正在构建静态网站，产物输出到 site 目录
echo ============================================
".venv\Scripts\mkdocs.exe" build --clean
if errorlevel 1 goto fail
echo.
echo 构建成功！静态文件位于: %~dp0site
goto end
:fail
echo.
echo 构建失败，请把上方报错信息发出来排查。
:end
pause
