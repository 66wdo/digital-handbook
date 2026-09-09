@echo off
cd /d "%~dp0"
set "GIT_PYTHON_GIT_EXECUTABLE=%~dp0..\runtime\PortableGit\cmd\git.exe"
set "DISABLE_MKDOCS_2_WARNING=true"
set "NO_MKDOCS_2_WARNING=true"
echo ============================================
echo   正在启动本地预览，请保持本窗口打开
echo   浏览器访问: http://127.0.0.1:8000
echo   停止服务: 在本窗口按 Ctrl+C
echo ============================================
start "" "http://127.0.0.1:8000"
".venv\Scripts\mkdocs.exe" serve
pause
