## 脚本

此目录包含各种实用脚本，它们不属于主 Web 应用程序的代码库，但用于开发、数据处理或其他辅助任务。

### `image_extractor.py`

此 Python 脚本旨在自动从图像中提取主要对象并将其保存为单独的文件。它使用 OpenCV 和 PIL 进行图像处理，包括：

-   读取和转换图像。
-   应用高斯模糊和自适应阈值。
-   执行形态学操作以填充孔洞。
-   查找和处理轮廓以提取感兴趣区域 (ROI)。
-   将提取的图像保存为带透明背景的 PNG 文件。

**用法：**

要运行脚本，请在终端中导航到此目录并执行：

```bash
python image_extractor.py
```

默认情况下，它将处理当前目录中的所有常见图像文件（JPG、JPEG、PNG、BMP、WEBP），并将提取的图像保存到 `extracted_images` 子目录中。您可以修改脚本中的 `process_directory` 函数以指定不同的输入或输出目录，或调整 `threshold` 和 `min_area` 等参数。

**依赖项：**

此脚本需要以下 Python 库：

-   `opencv-python`
-   `numpy`
-   `Pillow`

您可以使用 pip 安装它们：

```bash
pip install opencv-python numpy Pillow
```

### `comprehensiveTest.js`

此脚本用于模拟比赛创建、玩家注册和比赛进程，是进行端到端测试的工具。

**用法：**

```bash
node comprehensiveTest.js --players=<数量> --min=<数量> --max=<数量> --start --win --no-pp
```

**未来脚本：**

任何其他支持项目但不直接属于 Web 应用程序运行时的独立脚本都将放置在此目录中.