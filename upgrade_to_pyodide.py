#!/usr/bin/env python3
import re

# Pyodide 配置
pyodide_config = '''    <script type="text/javascript">
        // Pyodide 初始化状态
        let pyodide = null;
        let pyodideReady = false;
        
        // 加载 Pyodide
        async function loadPyodide() {
            try {
                console.log('正在加载 Pyodide...');
                pyodide = await loadPyodide({
                    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.1/full/",
                    stdout: ({text}) => {
                        if (window.currentOutputElement) {
                            window.currentOutputElement.textContent += text;
                        }
                    },
                    stderr: ({text}) => {
                        if (window.currentOutputElement) {
                            window.currentOutputElement.textContent += text;
                        }
                    }
                });
                pyodideReady = true;
                console.log('Pyodide 加载完成');
            } catch (error) {
                console.error('Pyodide 加载失败:', error);
            }
        }
        
        // 运行 Python 代码
        async function runPythonCode(code, outputElement) {
            window.currentOutputElement = outputElement;
            outputElement.innerHTML = '';
            
            try {
                // 等待 Pyodide 加载
                if (!pyodideReady) {
                    outputElement.textContent = '正在初始化 Python 环境...';
                    await loadPyodide();
                }
                
                outputElement.textContent = '';
                
                // 执行代码
                const result = await pyodide.runPythonAsync(code);
                
                // 处理返回值
                if (result !== undefined && result !== null) {
                    const strResult = String(result);
                    if (strResult && strResult.trim()) {
                        outputElement.textContent += strResult;
                    }
                }
                
                // 添加成功提示（如果没有输出）
                if (!outputElement.textContent.trim()) {
                    outputElement.innerHTML = '<span style="color: #4CAF50;">✓ 代码执行成功</span>';
                }
                
            } catch (error) {
                outputElement.innerHTML = `<span style="color: #f44747;">错误:</span><br>${error.message}`;
            } finally {
                window.currentOutputElement = null;
            }
        }
        
        // 页面加载时预加载 Pyodide
        window.addEventListener('DOMContentLoaded', function() {
            loadPyodide();
        });
    </script>'''

# 读取并更新 python-course.html
with open('python-course.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 替换 Brython 脚本标签
old_brython = re.search(r'<script.*?brython.*?</script>', content, re.DOTALL)
if old_brython:
    content = content[:old_brython.start()] + pyodide_config + content[old_brython.end():]

# 替换 script 标签中的 brython 初始化
content = content.replace('<script type="text/python">', '<!-- 已移除 Brython 脚本 -->')

# 替换旧的 runPythonCode 函数
old_function = re.search(r'// 运行 Python 代码[\s\S]*?function runCodeBlock', content)
if old_function:
    content = content[:old_function.start()] + '// runCodeBlock 保持不变，使用新的 runPythonCode' + content[old_function.end():]

# 移除旧的代码运行器初始化
content = re.sub(r'// 初始化代码运行器[\s\S]*?makeDraggable\(document', '// 代码运行器使用 Pyodide', content)

# 替换 CodeMirror 初始化
content = content.replace(
    'const codeEditor = CodeMirror.fromTextArea(document.getElementById("code-input"), {',
    'const codeEditor = CodeMirror.fromTextArea(document.getElementById("code-input"), {\n                    extraKeys: {\n                        "Tab": "indentMore",\n                        "Shift-Tab": "indentLess",\n                        "Ctrl-Enter": function(cm) {\n                            const code = cm.getValue();\n                            const outputElement = document.getElementById("code-output");\n                            runPythonCode(code, outputElement);\n                        }\n                    },'
)

# 替换 run-button 点击事件
content = content.replace(
    "document.querySelector('.run-button').addEventListener('click', function() {\n                    const code = codeEditor.getValue();\n                    const outputElement = document.getElementById('code-output');\n                    runPythonCode(code, outputElement);\n                });",
    "document.querySelector('.run-button').addEventListener('click', async function() {\n                    const code = codeEditor.getValue();\n                    const outputElement = document.getElementById('code-output');\n                    await runPythonCode(code, outputElement);\n                });"
)

# 写入更新后的文件
with open('python-course.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("✓ python-course.html 已更新为 Pyodide")

# 更新 python-exercises.html
with open('python-exercises.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 替换旧的 runExercise 函数
old_exercise = re.search(r'// 运行练习代码[\s\S]*?function initBrython', content)
if old_exercise:
    content = content[:old_exercise.start()] + '// 练习代码使用 Pyodide\n        async function runExercise(button) {\n            const exerciseBlock = button.closest(".exercise-code-block");\n            const code = exerciseBlock.querySelector("textarea").value;\n            const outputDiv = exerciseBlock.querySelector(".exercise-output");\n            \n            try {\n                outputDiv.textContent = "运行中...";\n                outputDiv.classList.remove("error");\n                \n                if (!pyodideReady) {\n                    outputDiv.textContent = "正在初始化 Python 环境...";\n                    await loadPyodide();\n                }\n                \n                outputDiv.textContent = "";\n                window.currentOutputElement = outputDiv;\n                \n                const result = await pyodide.runPythonAsync(code);\n                \n                if (result !== undefined && result !== null) {\n                    const strResult = String(result);\n                    if (strResult && strResult.trim()) {\n                        outputDiv.textContent += strResult;\n                    }\n                }\n                \n                if (!outputDiv.textContent.trim()) {\n                    outputDiv.textContent = "(无输出)";\n                }\n                \n            } catch (error) {\n                outputDiv.classList.add("error");\n                outputDiv.textContent = error.message;\n            } finally {\n                window.currentOutputElement = null;\n            }\n        }\n        ' + content[old_exercise.end():]

# 移除 initBrython 函数
content = re.sub(r'function initBrython\(\)[\s\S]*?}\s*\n\s*}', '', content)

# 写入更新后的文件
with open('python-exercises.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("✓ python-exercises.html 已更新为 Pyodide")
