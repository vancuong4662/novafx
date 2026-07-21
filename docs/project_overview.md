# NovaFX Project Overview

## 1. Project Goal

NovaFX là một **2D Visual Effect Framework** dành cho JavaScript Canvas.

NovaFX **không phải Particle Engine đơn thuần**, mà là một hệ thống bao gồm:

* Runtime Engine
* Visual Editor
* Effect Template Format

Mục tiêu của dự án là cho phép người dùng thiết kế effect bằng giao diện trực quan, export thành file JSON, sau đó có thể tái sử dụng effect đó ở bất kỳ project JavaScript Canvas nào chỉ bằng vài dòng code.

NovaFX hướng tới khả năng tái sử dụng tối đa.

Một effect được tạo một lần có thể dùng cho nhiều project game khác nhau mà không cần chỉnh sửa code.

---

# 2. Design Philosophy

NovaFX được xây dựng dựa trên một số nguyên tắc sau.

## Data Driven

Runtime không chứa dữ liệu của effect.

Runtime chỉ đọc file JSON rồi tạo effect.

Effect không được hardcode.

Ví dụ:

```text
Explosion.json

↓

NovaFX Runtime

↓

Explosion Effect
```

---

## Runtime và Editor tách biệt

Editor chỉ dùng để tạo effect.

Game hoàn toàn không cần editor.

Một project game chỉ cần:

```text
novafx.min.js

effects/

assets/
```

là đủ.

---

## Runtime hoàn toàn độc lập

NovaFX không phụ thuộc framework.

Không sử dụng:

* React
* Vue
* Phaser
* Pixi

Runtime chỉ yêu cầu:

CanvasRenderingContext2D

---

## Reusable

Effect chỉ cần tạo một lần.

Ví dụ:

```text
Explosion

Fire

Smoke

Heal

Rain
```

Sau đó mọi game đều có thể dùng lại.

---

# 3. Overall Architecture

```text
                  NovaFX

          +-------------------+
          |      Editor       |
          +-------------------+
                    │
               Export JSON
                    │
                    ▼
             Effect Template
                    │
                    ▼
          +-------------------+
          |     Runtime       |
          +-------------------+
                    │
                    ▼
          Javascript Canvas
```

Editor và Runtime không phụ thuộc nhau.

---

# 4. Runtime Architecture

Runtime gồm nhiều tầng.

```text
NovaFX

↓

EffectManager

↓

EffectTemplate

↓

EffectInstance

↓

Emitter

↓

Particle

↓

Tracks

↓

Phases
```

Mỗi tầng có trách nhiệm riêng.

---

# 5. Effect Manager

Toàn game chỉ tồn tại duy nhất một EffectManager.

Nó chịu trách nhiệm:

* load effect
* cache effect
* play effect
* update effect
* destroy effect

Game sẽ không tạo Particle trực tiếp.

Game chỉ làm việc với EffectManager.

Ví dụ:

```javascript
fx.play("explosion", x, y);
```

---

# 6. Effect Template

Effect Template là dữ liệu được đọc từ JSON.

Template không chạy.

Template chỉ mô tả effect.

Ví dụ:

```text
Explosion.json

↓

parse

↓

EffectTemplate
```

Template sẽ được cache.

Khi play:

Template

↓

clone

↓

Effect Instance

Không parse JSON lần thứ hai.

---

# 7. Effect Instance

Effect Instance là một effect đang tồn tại trong game.

Ví dụ:

```text
Explosion #1

Explosion #2

Explosion #3
```

Mỗi instance đều độc lập.

Mỗi instance có:

* position
* rotation
* scale
* lifetime
* particle surface
* emitter list

---

# 8. Particle Surface

Đây là một trong những điểm khác biệt của NovaFX.

Mỗi Effect sẽ sở hữu một surface riêng.

Ví dụ:

```text
Explosion

↓

Particle Surface

↓

Draw lên Main Canvas
```

Particle không vẽ trực tiếp lên game canvas.

Toàn bộ particle của effect được render lên particle surface trước.

Sau đó mới draw surface lên canvas chính.

Lợi ích:

* cache
* rotate cả effect
* scale cả effect
* blend mode
* filter
* post processing

Surface chỉ tồn tại trong lifetime của Effect.

---

# 9. Emitter

Một Effect có thể chứa nhiều Emitter.

Ví dụ:

```text
Explosion

├── Flash
├── Smoke
├── Spark
└── Debris
```

Emitter chịu trách nhiệm sinh particle.

Emitter không render.

Emitter chỉ tạo Particle.

Một emitter có thể:

* burst
* continuous
* loop
* interval

Sau này có thể mở rộng:

* circle emitter
* line emitter
* box emitter
* polygon emitter

mà không cần sửa Particle.

---

# 10. Particle

Particle là đơn vị nhỏ nhất.

Particle chỉ chứa dữ liệu.

Particle không có logic gameplay.

Particle không va chạm.

Particle không có event.

Particle chỉ dùng để render.

Particle bao gồm:

* transform
* current phase
* tracks
* sprite reference
* lifetime

---

# 11. Track System

NovaFX không thiết kế riêng từng property.

Thay vào đó, mọi property đều là Track.

Ví dụ:

```text
Alpha Track

Size Track

Rotation Track

Speed Track

Direction Track

Gravity Track

Color Track
```

Track là một controller.

Runtime chỉ cần một hệ thống update Track.

Không cần viết logic riêng cho từng property.

Điều này giúp runtime rất nhỏ và dễ mở rộng.

---

# 12. Phase System

Mỗi Track gồm nhiều Phase.

Thông thường:

```text
Phase 1

↓

Phase 2

↓

Phase 3
```

Phase mô tả cách property thay đổi.

Ví dụ:

Alpha

```text
0.3

↓

0.8

↓

0
```

Scale

```text
0.2

↓

1.0

↓

1.4
```

Color

```text
White

↓

Orange

↓

Red
```

Nếu Phase cuối không khai báo target thì Runtime sẽ sử dụng default behavior của property.

Ví dụ:

Alpha

↓

fade về 0.

---

# 13. End Condition

Mỗi Phase có điều kiện kết thúc riêng.

Không cố định.

Ví dụ:

TargetReached

Duration

Lifetime Percentage

Manual

Phase chỉ chuyển sang phase tiếp theo khi điều kiện hoàn thành.

Điều này giúp Effect tự nhiên hơn nhiều so với timeline cố định.

---

# 14. Shape System

Particle không bị giới hạn bởi sprite.

Shape có hai nguồn.

## Built-in Shape

NovaFX cung cấp một bộ PNG mặc định.

Ví dụ:

* circle
* soft circle
* ring
* pixel
* star
* spark
* smoke
* line
* square

Các asset này đi kèm Runtime.

---

## Custom Shape

Editor cho phép upload PNG.

PNG được quản lý bởi Asset Manager.

Particle chỉ lưu Asset ID.

Không lưu image.

---

# 15. Asset Manager

Runtime chỉ load asset một lần.

Sau đó cache.

Particle chỉ giữ reference.

Không tạo Image mới.

Asset Manager chịu trách nhiệm:

* load image
* cache
* lookup
* release

Có thể sử dụng texture atlas để giảm request.

---

# 16. Effect JSON

JSON là format chính của NovaFX.

Runtime chỉ đọc JSON.

Không đọc code.

JSON mô tả:

* effect
* emitters
* particle
* tracks
* phases
* asset reference

JSON không chứa image.

JSON chỉ chứa Asset ID.

---

# 17. Runtime Cache

Runtime chỉ parse JSON một lần.

Sau đó tạo EffectTemplate.

```text
Explosion.json

↓

EffectTemplate

↓

Cache
```

Khi play:

Template

↓

clone

↓

Instance

Không parse JSON nữa.

---

# 18. Visual Editor

Editor là công cụ tạo Effect.

Editor không thuộc Runtime.

Editor chỉ export JSON.

Editor cần bao gồm:

## Preview

Canvas chạy realtime.

Cho phép:

* play
* pause
* restart
* slow motion

Người dùng chỉnh thông số và xem kết quả ngay lập tức.

---

## Inspector

Hiển thị toàn bộ thuộc tính.

Ví dụ:

Emitter

Particle

Track

Phase

Surface

---

## Asset Panel

Quản lý:

* builtin asset
* upload png
* rename
* preview

---

## Track Editor

Người dùng chỉnh:

Alpha

↓

Phase

↓

Target

↓

Random Change

↓

End Condition

Tương tự cho mọi Track khác.

---

# 19. Runtime API Philosophy

Runtime phải cực kỳ đơn giản.

Ví dụ:

```javascript
const fx = new NovaFX(canvas);

await fx.load("effects/explosion.json");

fx.play("explosion", x, y);
```

Game sẽ không bao giờ thao tác với:

Particle

Track

Phase

Emitter

Những thành phần này hoàn toàn là chi tiết nội bộ của Runtime.

---

# 20. Separation of Responsibility

NovaFX được chia thành ba tầng độc lập:

**Editor**

* Thiết kế effect.
* Chỉnh thông số trực quan.
* Preview realtime.
* Export JSON.

**Runtime**

* Đọc JSON.
* Cache template.
* Tạo Effect Instance.
* Update.
* Render.
* Destroy.

**Game**

* Chỉ gọi API.
* Không biết particle hoạt động như thế nào.
* Không biết effect được cấu hình ra sao.
* Chỉ yêu cầu phát hoặc dừng effect.

Sự tách biệt này là nguyên tắc cốt lõi của NovaFX và cần được duy trì trong toàn bộ quá trình phát triển.

---

# 21. Những nguyên tắc kỹ thuật cần tuân thủ

Trong quá trình triển khai, mọi thành phần của NovaFX nên tuân theo các nguyên tắc sau:

* **Data-driven**: Không hardcode thông số effect trong Runtime.
* **Module hóa**: Mỗi lớp chỉ đảm nhận một trách nhiệm duy nhất.
* **Không phụ thuộc framework**: Runtime chỉ sử dụng JavaScript và Canvas API.
* **Hiệu năng**: Hạn chế cấp phát đối tượng mới trong vòng lặp cập nhật; ưu tiên tái sử dụng dữ liệu khi có thể.
* **Mở rộng**: Việc bổ sung Track, End Condition hoặc loại Emitter mới không được yêu cầu sửa đổi kiến trúc hiện có.
* **Editor và Runtime tách biệt hoàn toàn**: Hai phần có thể phát triển và phát hành độc lập.