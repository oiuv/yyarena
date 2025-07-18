import cv2
import numpy as np
from PIL import Image
import os
from pathlib import Path

def extract_images(input_path, output_dir='extracted_images', threshold=20, min_area=1000, global_counter=None):
    """
    从图像中自动提取主体并保存为单独文件
    
    参数:
    input_path: 输入图像路径
    output_dir: 输出目录
    threshold: 二值化阈值，控制分割敏感度
    min_area: 最小有效区域面积，过滤过小区域
    global_counter: 全局计数器，用于生成连续编号
    """
    # 创建输出目录
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    
    # 读取图像
    image = cv2.imread(input_path)
    if image is None:
        print(f"错误：无法读取图像 {input_path}")
        return 0
    
    # 转换为RGB（避免颜色问题）
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    
    # 转换为灰度图
    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    
    # 应用高斯模糊减少噪点
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    
    # 自适应阈值二值化
    thresh = cv2.adaptiveThreshold(blurred, 255, 
                                  cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                  cv2.THRESH_BINARY_INV, 11, 2)
    
    # 形态学操作：闭运算填充孔洞
    kernel = np.ones((5, 5), np.uint8)
    closed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
    
    # 查找轮廓
    contours, _ = cv2.findContours(closed.copy(), 
                                  cv2.RETR_EXTERNAL,
                                  cv2.CHAIN_APPROX_SIMPLE)
    
    # 处理每个轮廓
    count = 0
    for contour in contours:
        # 计算轮廓面积
        area = cv2.contourArea(contour)
        
        # 过滤小面积区域
        if area < min_area:
            continue
            
        count += 1
        # 获取边界框
        x, y, w, h = cv2.boundingRect(contour)
        
        # 提取ROI
        roi = image[y:y+h, x:x+w]
        
        # 创建透明背景
        transparent = np.zeros((h, w, 4), dtype=np.uint8)
        transparent[:, :, :3] = roi
        
        # 创建掩码
        mask = np.zeros((h, w), dtype=np.uint8)
        contour_roi = contour - np.array([[x, y]])
        cv2.drawContours(mask, [contour_roi], -1, 255, -1)
        
        # 应用掩码到alpha通道
        transparent[:, :, 3] = mask
        
        # 生成全局连续编号
        if global_counter is not None:
            global_counter[0] += 1
            file_number = global_counter[0]
        else:
            file_number = count
            
        # 保存为PNG文件，使用三位数字编号（无前缀）
        output_path = os.path.join(output_dir, f"{file_number:03d}.png")
        Image.fromarray(transparent).save(output_path)
        print(f"已保存: {output_path}")
    
    if count == 0:
        print(f"警告：未从 {input_path} 中提取到任何图像")
    
    return count

def process_directory(input_dir='.', output_dir='extracted_images', threshold=20, min_area=1000):
    """
    处理目录中的所有图像文件
    
    参数:
    input_dir: 输入目录，默认为当前目录
    output_dir: 输出目录
    threshold: 二值化阈值
    min_area: 最小有效区域面积
    """
    # 支持的图像文件扩展名
    IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.bmp', '.webp'}
    
    # 获取目录中的所有图像文件
    image_files = []
    for entry in os.scandir(input_dir):
        if entry.is_file() and entry.name.lower().endswith(tuple(IMAGE_EXTENSIONS)):
            image_files.append(entry.path)
    
    if not image_files:
        print(f"错误：在 {input_dir} 中未找到图像文件")
        return
    
    print(f"找到 {len(image_files)} 个图像文件，开始处理...")
    
    # 用于全局计数的列表（可变对象）
    global_counter = [0]
    
    # 处理每个图像文件
    total_extracted = 0
    for i, image_path in enumerate(image_files):
        print(f"\n处理文件 {i+1}/{len(image_files)}: {image_path}")
        extracted_count = extract_images(image_path, output_dir, threshold, min_area, global_counter)
        total_extracted += extracted_count
    
    print(f"\n全部处理完成！共提取 {total_extracted} 个图像，保存在 {os.path.abspath(output_dir)}")

if __name__ == "__main__":
    # 处理当前目录下的所有图片
    process_directory()
    
    # 如果你想处理特定目录中的图片，可以这样调用：
    # process_directory(input_dir=r"C:\path\to\your\images")