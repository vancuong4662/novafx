# NovaFX Effect JSON v1

Effect JSON v1 là format dữ liệu tối thiểu để Runtime parse thành `EffectTemplate`.

## Trường bắt buộc

```json
{
  "id": "explosion",
  "version": 1,
  "duration": 1.2,
  "surface": {
    "width": 256,
    "height": 256,
    "blendMode": "source-over"
  },
  "emitters": []
}
```

## Ý nghĩa

* `id`: id duy nhất của effect, dùng cho `fx.play(effectId, x, y)`.
* `version`: version của Effect JSON format.
* `duration`: thời lượng mặc định của effect instance, tính bằng giây.
* `surface.width`: chiều rộng particle surface dự kiến.
* `surface.height`: chiều cao particle surface dự kiến.
* `surface.blendMode`: blend mode mặc định khi render surface.
* `emitters`: danh sách emitter. Phase 2 chỉ yêu cầu tồn tại mảng, nội dung sẽ được định nghĩa ở các phase sau.

## Trường tùy chọn

* `name`: tên hiển thị của effect. Nếu không khai báo, Runtime dùng `id`.

## Emitter

Từ Phase 4, mỗi item trong `emitters` có format cơ bản:

```json
{
  "id": "flash",
  "enabled": true,
  "shape": {
    "type": "circle",
    "x": 0,
    "y": 0,
    "radius": 32
  },
  "emission": {
    "type": "burst",
    "count": 24,
    "startTime": 0,
    "loop": false
  },
  "particle": {
    "lifetime": {
      "min": 0.35,
      "max": 0.7
    },
    "size": {
      "min": 2,
      "max": 6
    },
    "speed": {
      "min": 12,
      "max": 36
    },
    "angle": {
      "min": 0,
      "max": 6.283185307179586
    },
    "spriteId": "circle",
    "tracks": []
  }
}
```

### Emission type

* `burst`: sinh `count` particle một lần. Nếu `loop` là `true`, burst lặp lại theo `interval`.
* `continuous`: sinh particle theo `rate` mỗi giây.
* `interval`: sinh `count` particle theo chu kỳ `interval`. Nếu `loop` là `false`, chỉ sinh một lần.

### Shape type

* `point`: sinh tại `x`, `y`.
* `nova_point`: sinh tại `x`, `y` như `point`, đồng thời mỗi particle luôn tự cập nhật `rotation` để hướng về lại điểm emitter trong lúc di chuyển. `angleOffset` là góc cộng thêm, tính bằng radian.
* `circle`: sinh trong hình tròn `x`, `y`, `radius`.
* `line`: sinh trên đoạn thẳng `x1`, `y1`, `x2`, `y2`.
* `box`: sinh trong vùng chữ nhật `x`, `y`, `width`, `height`.

Emitter chỉ sinh particle descriptors. Emitter không render.

## Particle

Từ Phase 5, mỗi emitter có thể khai báo `particle` để mô tả dữ liệu particle được spawn.

Các trường ban đầu:

* `lifetime`: thời gian sống của particle, tính bằng giây.
* `size`: kích thước render debug hiện tại.
* `speed`: tốc độ di chuyển.
* `angle`: hướng di chuyển, tính bằng radian.
* `rotation`: rotation ban đầu.
* `scale`: scale ban đầu.
* `blendMode`: blend mode khi render particle lên particle surface. Mặc định là `source-over`.
* `spriteId`: id asset/shape tham chiếu. Asset Manager resolve id này thành image đã cache.
* `tracks`: danh sách track gắn với particle. Track System sẽ xử lý chi tiết ở phase sau.

Các trường numeric có thể là số cố định hoặc random range:

```json
{
  "min": 2,
  "max": 6
}
```

Particle không có collision, event gameplay hoặc dependency vào game.

## Asset và Shape

Từ Phase 8, `particle.spriteId` tham chiếu asset đã đăng ký trong `AssetManager`. Effect JSON chỉ lưu id, không nhúng image data.

Built-in shape mặc định được resolve từ thư mục public:

```text
public/img/particleShapes
```

Các id built-in ban đầu:

* `circle`
* `soft-circle`
* `ring`
* `pixel`
* `star`
* `spark`
* `smoke`
* `line`
* `square`
* `diamond`
* `hexagon`
* `snow`
* `dot`

Custom PNG có thể được đăng ký trước khi load/play effect:

```javascript
fx.registerAsset('magic-rune', '/assets/magic-rune.png');
```

Editor có thể export manifest asset riêng để game đăng ký trước khi load Effect JSON:

```json
{
  "version": 1,
  "assets": [{ "id": "magic-rune", "src": "assets/magic-rune.png" }]
}
```

Effect JSON vẫn chỉ lưu `spriteId`, không nhúng dữ liệu ảnh.

## Track

Từ Phase 6, `particle.tracks` được Runtime update bằng một pipeline chung.

Format cơ bản:

```json
{
  "property": "alpha",
  "phases": [
    {
      "from": 1,
      "to": 0,
      "duration": 0.7,
      "randomChange": {
        "min": -0.1,
        "max": 0.1
      },
      "endCondition": {
        "type": "duration"
      }
    }
  ]
}
```

Các track property ban đầu:

* `alpha`
* `size`
* `rotation`
* `speed`
* `direction`
* `gravity`
* `color`

`from`, `to`, và `randomChange` có thể dùng số cố định hoặc random range `{ "min": number, "max": number }` với các property dạng số. `color` hỗ trợ interpolation giữa màu hex dạng `#rrggbb`.

Track vẫn hỗ trợ dạng rút gọn `from/to/duration` cho một phase, nhưng format chính thức nên dùng `phases`.

## Phase và End Condition

Mỗi Track có thể có nhiều phase. Runtime chỉ chuyển sang phase tiếp theo khi `endCondition` của phase hiện tại hoàn thành.

Các `endCondition.type` ban đầu:

* `duration`: phase kết thúc khi chạy đủ `duration` giây.
* `targetReached`: phase kết thúc khi property đạt `to`.
* `lifetimePercentage`: phase kết thúc khi `particle.age / particle.lifetime` đạt `value`.
* `manual`: phase không tự chuyển. Runtime đã hỗ trợ dữ liệu và API nội bộ `manualNext()`, UI/editor sẽ dùng sau.

Nếu phase cuối của `alpha` không khai báo `to`, Runtime mặc định fade alpha về `0`.

## Nguyên tắc

* JSON chỉ chứa dữ liệu mô tả effect.
* JSON không chứa image data.
* Runtime parse JSON thành `EffectTemplate` một lần, sau đó cache template.
* Mỗi lần `play()` tạo dữ liệu instance bằng clone từ template đã cache.