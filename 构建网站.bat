@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================
echo   正在构建静态网站，产物输出到 site\ 目录
echo ============================================
".venv\Scripts\mkdocs.exe" build --clean
if %errorlevel%==0 (
    echo.
    echo 构建成功！静态文件位于: %~dp0site
) else (
    echo.
    echo 构建失败，请把上方报错信息发出来排查。
)
pause
