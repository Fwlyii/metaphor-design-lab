# 隐喻设计对比实验室

两个合成数据案例，对比普通直接提示与 ideation-v2 的 Guided / Blind 组织流程。

共 24 张图：2 个案例 × 2 组 × 6 个完整方案。网页公开逐步过程、具体映射、全部图片和可下载的实验记录。

- 文本：当前 Codex 会话；图像：内置 imagegen。
- 每例每组一轮，未匹配计算预算，未进行独立用户研究。
- 仓库参考提交：`aafc7cda61b9fcb47d1536dbfad664c10352431e`。
- 具体代码修复、实际 Blind 兜底与候选截断情况见网页说明。

这是静态 HTML / CSS / JavaScript 网站，可通过 GitHub Pages 直接访问。


## 改进筛选回放

原轮次的候选上限配置是6，原仓库默认30。新增分支在完整候选池上保留六种Guided策略各1个，以及4个不重复的Blind兜底候选，每例10个。

`candidate-selection.py` 与 `selection-pool.json`、`selection-review.json` 可用于复核筛选。选择优先级是当前Codex的设计判断，不是独立效果评分。

本次只回放并完成筛选，尚未执行改进分支的Module3或重新生图。原来的24张图片属于原轮次。Blind的主题短语到词表接口问题已定位，本次回放仍保留原始兜底结果。
