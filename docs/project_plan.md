# NovaFX Project Plan

Tài liệu này là kế hoạch triển khai chi tiết cho NovaFX và cũng là nơi đánh dấu tiến độ trong quá trình phát triển.

Quy ước trạng thái:

* `[ ]` Chưa làm
* `[~]` Đang làm
* `[x]` Hoàn thành
* `[!]` Có vấn đề cần xử lý

---

## 1. Mục tiêu triển khai

NovaFX cần được triển khai theo hướng **runtime trước, editor sau**.

Lý do:

* Runtime là nền tảng để kiểm chứng toàn bộ Effect JSON.
* Editor chỉ nên tạo dữ liệu mà Runtime đã hiểu rõ.
* API game cần ổn định sớm để đảm bảo framework đúng triết lý sử dụng.

Thứ tự ưu tiên tổng quát:

```text
Core Runtime
↓
Effect JSON Format
↓
Emitter / Particle / Track / Phase
↓
Rendering Surface
↓
Asset Manager
↓
Runtime API
↓
Visual Editor
↓
Export / Import Workflow
↓
Examples / Packaging
```

---

## 2. Phase 0 - Khởi tạo nền tảng dự án

### Mục tiêu

Thiết lập cấu trúc project đủ rõ để phát triển Runtime và Editor độc lập.

### Công việc

* [x] Chọn stack triển khai cho Runtime: JavaScript thuần, ES Modules, Canvas 2D API, JSDoc, Vite/Rollup library build.
* [x] Chọn stack triển khai cho Editor: JavaScript, React, Vite, Zustand hoặc state store nhẹ tương đương.
* [x] Tạo cấu trúc thư mục chính.
* [x] Tạo cấu hình build.
* [x] Tạo cấu hình lint / format nếu cần.
* [x] Tạo demo canvas tối thiểu để chạy Runtime.
* [x] Tạo tài liệu quy ước phát triển.

### Stack đã chọn

Runtime cần ưu tiên khả năng nhúng vào các project web game JavaScript thuần dùng Canvas, vì vậy Runtime không dùng TypeScript và không phụ thuộc framework.

```text
Runtime:
  JavaScript thuần
  ES Modules
  Canvas 2D API
  JSDoc cho mô tả API và hỗ trợ gợi ý type trong editor
  Vite library mode hoặc Rollup để build bundle phân phối
  Vitest cho unit test

Editor:
  JavaScript
  React
  Vite
  Zustand hoặc state store nhẹ tương đương
  CSS thuần / CSS variables cho giao diện editor

Validation:
  Parser validate thủ công ở giai đoạn đầu
  JSON Schema sau khi Effect JSON format ổn định
```

### Cấu trúc đề xuất

```text
src/
  runtime/
    core/
    emitter/
    particle/
    track/
    phase/
    render/
    asset/
  editor/
  shared/
examples/
effects/
assets/
public/
  img/
    particleShapes/
docs/
```

### Tiêu chí hoàn thành

* Có thể chạy một trang demo canvas rỗng.
* Runtime và Editor có ranh giới thư mục rõ ràng.
* Có lệnh build hoặc dev tối thiểu.

### Ghi chú tiến độ

* Trạng thái: `[x]`
* Ghi chú: Đã tạo scaffold dự án, cấu hình dev/build/lint/format/test, demo canvas tối thiểu, khung thư mục Runtime/Editor/Shared và tài liệu quy ước phát triển. Đã validate bằng `npm run lint`, `npm run build` và `npm run build:runtime`.

---

## 3. Phase 1 - Runtime Core Skeleton

### Mục tiêu

Xây dựng bộ khung Runtime độc lập với framework, chỉ phụ thuộc JavaScript Canvas API.

### Công việc

* [x] Tạo lớp `NovaFX` làm public API chính.
* [x] Tạo `EffectManager` quản lý load, cache, play, update, render, destroy.
* [x] Tạo vòng đời Runtime: `update(deltaTime)`, `render(ctx)`, `destroy()`.
* [x] Tạo cơ chế quản lý danh sách effect instance đang chạy.
* [x] Tạo demo gọi API dạng:

```javascript
const fx = new NovaFX(canvas);
await fx.load("effects/explosion.json");
fx.play("explosion", x, y);
```

### Phạm vi chưa làm trong phase này

* Chưa cần Track đầy đủ.
* Chưa cần Editor.
* Chưa cần asset upload.

### Tiêu chí hoàn thành

* Game/demo chỉ tương tác thông qua `NovaFX` hoặc `EffectManager`.
* Không có code game nào tạo trực tiếp `Particle`, `Emitter`, `Track` hoặc `Phase`.
* Runtime có thể tạo và hủy một effect instance giả lập.

### Ghi chú tiến độ

* Trạng thái: `[x]`
* Ghi chú: Đã tách `NovaFX` thành public API, thêm `EffectManager`, `EffectInstance` giả lập, demo `load()` / `play()` với `effects/explosion.json`, và test lifecycle manager. Đã validate bằng `npm run lint`, `npm run test`, `npm run build` và `npm run build:runtime`.

---

## 4. Phase 2 - Effect JSON và Template Cache

### Mục tiêu

Định nghĩa format dữ liệu ban đầu cho Effect JSON và cơ chế parse thành `EffectTemplate`.

### Công việc

* [x] Thiết kế schema JSON phiên bản đầu tiên.
* [x] Tạo `EffectTemplate` chỉ chứa dữ liệu mô tả effect.
* [x] Tạo parser đọc JSON thành template nội bộ.
* [x] Tạo cache template theo effect id hoặc URL.
* [x] Đảm bảo `load()` parse JSON một lần duy nhất.
* [x] Đảm bảo `play()` clone từ template đã cache.
* [x] Tạo effect mẫu `explosion.json` tối thiểu.

### JSON tối thiểu đề xuất

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

### Tiêu chí hoàn thành

* Runtime load được file JSON từ `effects/`.
* Template được cache và không parse lại khi play nhiều lần.
* Có kiểm tra lỗi cơ bản cho JSON thiếu trường bắt buộc.

### Ghi chú tiến độ

* Trạng thái: `[x]`
* Ghi chú: Đã tạo `EffectTemplate`, parser Effect JSON v1, validation trường bắt buộc, cache template theo id và URL, clone dữ liệu template khi `play()`, tài liệu `docs/effect_json_v1.md`, và cập nhật `effects/explosion.json`. Đã validate bằng `npm run test`, `npm run lint`, `npm run build` và `npm run build:runtime`.

---

## 5. Phase 3 - Effect Instance và Particle Surface

### Mục tiêu

Triển khai effect instance độc lập và cơ chế render qua particle surface riêng.

### Công việc

* [x] Tạo `EffectInstance` với position, rotation, scale, lifetime.
* [x] Tạo offscreen particle surface cho từng instance.
* [x] Render particle lên surface trước.
* [x] Draw surface lên main canvas.
* [x] Hỗ trợ transform toàn effect: translate, rotate, scale.
* [x] Hỗ trợ blend mode ở cấp surface.
* [x] Hủy surface khi effect kết thúc.

### Tiêu chí hoàn thành

* Mỗi effect instance có surface riêng trong lifetime của nó.
* Có thể play nhiều instance cùng một template ở vị trí khác nhau.
* Transform effect không làm thay đổi dữ liệu particle gốc.

### Ghi chú tiến độ

* Trạng thái: `[x]`
* Ghi chú: Đã thêm `ParticleSurface`, mỗi `EffectInstance` tạo surface riêng theo `template.surface`, render lên surface trước rồi `drawImage` lên main canvas với transform và blend mode. Surface được hủy khi instance hết lifetime hoặc `EffectManager.destroy()`. Đã validate bằng `npm run test`, `npm run lint`, `npm run build` và `npm run build:runtime`.

---

## 6. Phase 4 - Emitter System

### Mục tiêu

Tạo hệ thống emitter chịu trách nhiệm sinh particle nhưng không render.

### Công việc

* [x] Tạo lớp `Emitter` từ dữ liệu template.
* [x] Hỗ trợ burst emission.
* [x] Hỗ trợ continuous emission.
* [x] Hỗ trợ interval emission.
* [x] Hỗ trợ loop emission.
* [x] Tạo cơ chế spawn particle theo cấu hình emitter.
* [x] Tách emitter shape khỏi particle logic.

### Loại emitter ban đầu đề xuất

* [x] Point emitter.
* [x] Circle emitter.
* [x] Line emitter.
* [x] Box emitter.

### Tiêu chí hoàn thành

* Một effect có thể chứa nhiều emitter.
* Mỗi emitter có thể bật / tắt độc lập theo dữ liệu JSON.
* Emitter chỉ tạo particle, không vẽ lên canvas.

### Ghi chú tiến độ

* Trạng thái: `[x]`
* Ghi chú: Đã thêm `Emitter` sinh particle descriptors từ template, hỗ trợ burst, continuous, interval, loop và shape point/circle/line/box. `EffectInstance` cập nhật nhiều emitter và render debug particles trên surface; emitter không render trực tiếp. Đã cập nhật `effects/explosion.json` và `docs/effect_json_v1.md`. Đã validate bằng `npm run test`, `npm run lint`, `npm run build` và `npm run build:runtime`.

---

## 7. Phase 5 - Particle Model và Object Lifecycle

### Mục tiêu

Triển khai particle là đơn vị dữ liệu nhỏ nhất, phục vụ render effect nhưng không chứa logic gameplay.

### Công việc

* [x] Tạo model `Particle` gồm transform, lifetime, age, sprite reference, tracks.
* [x] Tạo vòng đời particle: spawn, update, render, recycle / destroy.
* [x] Tạo particle pool để hạn chế cấp phát trong update loop.
* [x] Tạo random range helper cho các giá trị như size, speed, angle, lifetime.
* [x] Đảm bảo particle không có collision, event gameplay hoặc dependency game.

### Tiêu chí hoàn thành

* Particle có thể được tái sử dụng qua pool.
* Particle tự kết thúc khi hết lifetime.
* Runtime không tạo object mới không cần thiết trong mỗi frame.

### Ghi chú tiến độ

* Trạng thái: `[x]`
* Ghi chú: Đã thêm `Particle`, `ParticlePool`, helper `resolveRandomRange`, particle config trong emitter JSON, lifecycle spawn/update/recycle trong `EffectInstance`, và render debug particle từ dữ liệu particle thật. Particle chỉ chứa dữ liệu và update transform/lifetime, không có collision/event gameplay. Đã validate bằng `npm run test`, `npm run lint`, `npm run build` và `npm run build:runtime`.

---

## 8. Phase 6 - Track System

### Mục tiêu

Xây dựng hệ thống Track dùng chung cho mọi property thay đổi theo thời gian.

### Công việc

* [x] Tạo interface / base class cho Track.
* [x] Tạo Track runtime update chung.
* [x] Tạo cơ chế bind Track vào property của particle.
* [x] Hỗ trợ interpolation cơ bản.
* [x] Hỗ trợ random change trong phase.
* [x] Tạo các track ban đầu.

### Track ban đầu

* [x] Alpha Track.
* [x] Size Track.
* [x] Rotation Track.
* [x] Speed Track.
* [x] Direction Track.
* [x] Gravity Track.
* [x] Color Track.

### Tiêu chí hoàn thành

* Runtime update Track bằng một pipeline chung.
* Thêm Track mới không yêu cầu sửa kiến trúc emitter hoặc particle.
* Track được cấu hình hoàn toàn từ JSON.

### Ghi chú tiến độ

* Trạng thái: `[x]`
* Ghi chú: Đã thêm `Track` runtime pipeline, bind track vào property của `Particle`, interpolation số/màu, `randomChange`, và các track alpha/size/rotation/speed/direction/gravity/color. Track được cấu hình từ JSON và cập nhật trong `Particle.update()`. Đã cập nhật `effects/explosion.json` và `docs/effect_json_v1.md`. Đã validate bằng `npm run lint`, `npm run test`, `npm run build` và `npm run build:runtime`.

---

## 9. Phase 7 - Phase System và End Condition

### Mục tiêu

Cho phép mỗi Track gồm nhiều Phase, mỗi Phase có điều kiện kết thúc riêng.

### Công việc

* [x] Tạo model `Phase`.
* [x] Tạo phase transition pipeline.
* [x] Hỗ trợ end condition `Duration`.
* [x] Hỗ trợ end condition `TargetReached`.
* [x] Hỗ trợ end condition `LifetimePercentage`.
* [x] Hỗ trợ end condition `Manual` ở mức dữ liệu, có thể chưa cần UI.
* [x] Tạo default behavior cho phase cuối khi thiếu target.

### Tiêu chí hoàn thành

* Track có thể chuyển qua nhiều phase trong lifetime particle.
* Mỗi phase tự quyết định khi nào kết thúc.
* Alpha có thể fade về 0 theo default behavior khi phase cuối thiếu target.

### Ghi chú tiến độ

* Trạng thái: `[x]`
* Ghi chú: Đã thêm `Phase`, transition pipeline nhiều phase trong `Track`, end condition duration/targetReached/lifetimePercentage/manual, `manualNext()` ở mức runtime, và default alpha fade về `0` khi phase cuối thiếu target. Đã cập nhật `effects/explosion.json` sang `phases[]` và tài liệu `docs/effect_json_v1.md`. Đã validate bằng `npm run test`, `npm run lint`, `npm run build` và `npm run build:runtime`.

---

## 10. Phase 8 - Shape System và Asset Manager

### Mục tiêu

Triển khai nguồn hình particle từ built-in shape và custom PNG thông qua Asset Manager.

### Công việc

* [x] Tạo `AssetManager` load, cache, lookup, release image.
* [x] Tạo danh sách built-in shape mặc định từ folder `public/img/particleShapes`.
* [x] Tạo cơ chế particle chỉ lưu asset id hoặc asset reference.
* [x] Đảm bảo không tạo `Image` mới cho từng particle.
* [x] Hỗ trợ custom PNG qua asset id.
* [x] Thiết kế khả năng mở rộng texture atlas.

### Nguồn built-in shape

Các shape mặc định của NovaFX sẽ được lấy từ:

```text
public/img/particleShapes
```

Runtime chỉ nên tham chiếu built-in shape bằng asset id hoặc đường dẫn được Asset Manager resolve. Effect JSON không được nhúng image data.

### Built-in shape ban đầu

* [x] Circle.
* [x] Soft circle.
* [x] Ring.
* [x] Pixel.
* [x] Star.
* [x] Spark.
* [x] Smoke.
* [x] Line.
* [x] Square.

### Tiêu chí hoàn thành

* Runtime chỉ load mỗi asset một lần từ `public/img/particleShapes` hoặc nguồn custom asset đã đăng ký.
* Particle render bằng asset reference.
* Effect JSON không chứa image data, chỉ chứa asset id.

### Ghi chú tiến độ

* Trạng thái: `[x]`
* Ghi chú: Đã thêm `AssetManager` với load/cache/lookup/release/destroy, registry built-in shape từ `public/img/particleShapes`, preload asset theo `particle.spriteId` khi load template, API `fx.registerAsset()` cho custom PNG, và render particle bằng asset reference qua `drawImage`. Particle chỉ giữ `spriteId`; image được cache ở manager, không tạo mới theo từng particle. Các built-in id ban đầu đã được map vào PNG hiện có trong folder asset và có thể thay bằng texture riêng sau. Đã validate bằng `npm run test`, `npm run lint`, `npm run build` và `npm run build:runtime`.

---

## 11. Phase 9 - Runtime Rendering và Performance Pass

### Mục tiêu

Hoàn thiện render pipeline và tối ưu các điểm ảnh hưởng trực tiếp tới game loop.

### Công việc

* [x] Tối ưu clear / draw particle surface.
* [x] Hỗ trợ alpha, color, scale, rotation khi render particle.
* [x] Hỗ trợ blend mode cơ bản.
* [x] Hạn chế allocation trong update và render loop.
* [x] Thêm thống kê debug tùy chọn: instance count, particle count, draw count.
* [x] Kiểm thử nhiều effect instance chạy đồng thời.

### Tiêu chí hoàn thành

* Demo chạy ổn định với nhiều instance.
* Particle count không tăng rò rỉ sau khi effect kết thúc.
* Surface được giải phóng đúng lúc.

### Ghi chú tiến độ

* Trạng thái: `[x]`
* Ghi chú: Đã tối ưu render để clear surface nhưng bỏ qua draw surface rỗng, render particle với alpha/color/scale/rotation/blend mode, thêm reusable spawn buffer cho emitter để hạn chế allocation array trong update loop, và bổ sung `getStats()` cho instance count/particle count/draw count. Đã thêm test nhiều instance chạy đồng thời để kiểm tra particle không tăng rò rỉ sau khi hết lifetime và surface không draw khi không còn particle. Đã validate bằng `npm run test`, `npm run lint`, `npm run build` và `npm run build:runtime`.

---

## 12. Phase 10 - Runtime Public API

### Mục tiêu

Đóng gói Runtime thành API đơn giản, ổn định và dễ dùng trong game JavaScript Canvas.

### Công việc

* [x] Chuẩn hóa constructor `new NovaFX(canvasOrContext, options)`.
* [x] Chuẩn hóa `load(effectUrlOrObject)`.
* [x] Chuẩn hóa `play(effectId, x, y, options)`.
* [x] Thêm `stop(instanceId)` nếu cần.
* [x] Thêm `update(deltaTime)` cho game loop tự quản lý.
* [x] Thêm `render()` hoặc `render(ctx)` tùy thiết kế cuối.
* [x] Thêm `destroy()`.
* [x] Viết tài liệu API tối thiểu.

### Tiêu chí hoàn thành

* Game không cần biết `Particle`, `Track`, `Phase`, `Emitter`.
* API đủ để load và play effect trong một project Canvas độc lập.
* Runtime có thể build thành file phân phối độc lập.

### Ghi chú tiến độ

* Trạng thái: `[x]`
* Ghi chú: Đã chuẩn hóa public API `NovaFX` cho canvas hoặc 2D context bằng duck-typing, giữ `load()` cho URL/object, `play()` trả instance id, thêm `stop(instanceId)`, `update(deltaTime)`, `render(ctx)` trả draw count, `destroy()`, `getStats()` và `registerAsset()`. Đã thêm tài liệu tối thiểu tại `docs/runtime_api.md` và test public API không cần DOM globals. Đã validate bằng `npm run test`, `npm run lint`, `npm run build` và `npm run build:runtime`.

---

## 13. Phase 11 - Effect Examples và Preset Library

### Mục tiêu

Tạo bộ effect mẫu để kiểm chứng Runtime và dùng làm dữ liệu tham chiếu cho Editor.

### Công việc

* [x] Tạo `Explosion`.
* [x] Tạo `Fire`.
* [x] Tạo `Smoke`.
* [x] Tạo `Heal`.
* [x] Tạo `Rain`.
* [x] Tạo demo gallery để play từng effect.
* [x] Dùng các effect mẫu để kiểm tra JSON format.

### Tiêu chí hoàn thành

* Mỗi effect mẫu là file JSON riêng.
* Effect mẫu không cần sửa code Runtime để chạy.
* Gallery có thể kiểm thử nhiều effect nhanh.

### Ghi chú tiến độ

* Trạng thái: `[x]`
* Ghi chú: Đã tạo preset JSON riêng cho `explosion`, `fire`, `smoke`, `heal` và `rain`; cập nhật demo thành gallery có nút play từng effect và stats runtime; thêm test `presetLibrary.test.js` đọc toàn bộ `effects/*.json` và parse bằng Runtime parser để kiểm chứng format. Các preset chỉ dùng Effect JSON và asset id, không cần sửa Runtime để chạy. Đã validate bằng `npm run test`, `npm run lint`, `npm run build` và `npm run build:runtime`.

---

## 14. Phase 12 - Editor Foundation

### Mục tiêu

Khởi tạo Visual Editor tách biệt Runtime, dùng Runtime để preview effect.

### Công việc

* [x] Chọn cách build Editor.
* [x] Tạo layout chính gồm Preview, Inspector, Asset Panel, Track Editor.
* [x] Tích hợp Runtime vào Preview.
* [x] Tạo state model đại diện cho Effect JSON đang chỉnh sửa.
* [x] Tạo import JSON vào Editor.
* [x] Tạo export JSON từ Editor.

### Tiêu chí hoàn thành

* Editor không được Runtime require ngược lại.
* Editor có thể preview một effect JSON đang chỉnh sửa.
* Export từ Editor có thể chạy lại trong Runtime demo.

### Ghi chú tiến độ

* Trạng thái: `[x]`
* Ghi chú: Đã dựng Editor Foundation bằng React + Vite trong `src/editor`, tách khỏi Runtime và dùng public API `NovaFX` để preview Effect JSON. Layout gồm Preview, Inspector, Asset Panel và Track Editor summary; state model dùng Zustand để giữ Effect JSON, emitter đang chọn, background preview và stats. Preview mặc định dùng `public/img/background/forest.png`, hỗ trợ upload background riêng và tự scale cover theo canvas. Đã thêm import/export JSON, cập nhật entry app sang `src/main.jsx`, thêm helper/test cho background cover scaling, và thêm option Runtime `clearCanvas/showIdleState` để editor tự vẽ background trước khi render effect. Đã validate bằng `npm run test`, `npm run lint`, `npm run build` và `npm run build:runtime`.

---

## 15. Phase 13 - Editor Preview Controls

### Mục tiêu

Tạo trải nghiệm preview realtime để người dùng chỉnh effect và xem kết quả ngay.

### Công việc

* [ ] Play.
* [ ] Pause.
* [ ] Restart.
* [ ] Slow motion.
* [ ] Toggle loop preview.
* [ ] Reset camera / canvas view nếu có zoom pan.
* [ ] Hiển thị trạng thái particle count / time preview.

### Tiêu chí hoàn thành

* Người dùng có thể chỉnh dữ liệu và xem effect chạy lại.
* Preview dùng cùng Runtime với game demo.
* Preview không sinh format riêng ngoài Effect JSON.

### Ghi chú tiến độ

* Trạng thái: `[ ]`
* Ghi chú: Chưa bắt đầu.

---

## 16. Phase 14 - Inspector và Track Editor

### Mục tiêu

Cho phép chỉnh trực quan toàn bộ cấu hình effect, emitter, particle, track và phase.

### Công việc

* [x] Inspector cho Effect.
* [x] Inspector cho Surface.
* [x] Inspector cho Emitter.
* [x] Inspector cho Particle settings.
* [x] Track list.
* [x] Phase list cho mỗi Track.
* [x] Control chỉnh target, duration, random range, end condition.
* [x] Duplicate emitter đang mở với thông số y hệt và id mới.
* [x] Thay đổi thứ tự emitter để điều khiển depth theo thứ tự render.
* [x] Export / import riêng từng emitter.
* [x] Validation dữ liệu trước khi export.

### Tiêu chí hoàn thành

* Người dùng có thể tạo / sửa emitter từ UI.
* Người dùng có thể tạo / sửa track và phase từ UI.
* JSON export vẫn hợp lệ với Runtime parser.

### Ghi chú tiến độ

* Trạng thái: `[x]`
* Ghi chú: Đã thêm các helper immutable trong `src/editor/effectEditor.js` để chỉnh Effect JSON và validate bằng Runtime parser trước khi export. Editor UI hiện có Inspector cho Effect, Surface, Emitter, Particle settings; có thể thêm/xóa/duplicate emitter, export/import riêng từng emitter, đổi thứ tự emitter để điều khiển depth theo thứ tự render, chỉnh shape/emission/particle, thêm/xóa Track, thêm/xóa Phase, chỉnh property/from/to/duration/end condition. Track Editor dùng cùng Effect JSON và preview vẫn chạy qua Runtime, không tạo format riêng. Đã thêm test helper editor và validate bằng `npm run test`, `npm run lint`, `npm run build` và `npm run build:runtime`.

---

## 17. Phase 15 - Asset Panel và Custom Shape Workflow

### Mục tiêu

Quản lý built-in asset và custom PNG trong Editor, đồng thời xuất reference đúng cho Runtime.

### Công việc

* [x] Hiển thị built-in asset.
* [x] Upload PNG custom.
* [x] Preview asset.
* [x] Rename asset id.
* [x] Gán asset cho particle shape.
* [x] Export asset manifest nếu cần.
* [x] Đảm bảo JSON chỉ lưu asset id.

### Tiêu chí hoàn thành

* Custom shape có thể được dùng trong preview.
* Export JSON không nhúng image data.
* Runtime load lại đúng asset qua id hoặc manifest.

### Ghi chú tiến độ

* Trạng thái: `[x]`
* Ghi chú: Đã nâng Asset Panel để hiển thị built-in shape từ registry Runtime, upload PNG custom bằng object URL, preview thumbnail, rename custom asset id, gán asset vào `particle.spriteId`, và export manifest asset riêng. Preview register custom asset vào Runtime trước khi load Effect JSON, còn Export JSON chỉ lưu asset id. Runtime cũng nhận manifest dạng `{ assets: [...] }` khi load. Đã validate bằng `npm run test`, `npm run lint`, `npm run build` và `npm run build:runtime`.

---

## 18. Phase 16 - Packaging, Documentation và Release Candidate

### Mục tiêu

Đóng gói NovaFX thành bộ có thể dùng trong project game khác.

### Công việc

* [ ] Build Runtime thành file phân phối.
* [ ] Build Editor thành app / static site nếu cần.
* [ ] Viết hướng dẫn cài đặt Runtime.
* [ ] Viết hướng dẫn tạo effect bằng Editor.
* [ ] Viết hướng dẫn import effect vào game.
* [ ] Chuẩn hóa thư mục phân phối.
* [ ] Tạo release candidate đầu tiên.

### Package đầu ra đề xuất

```text
dist/
  novafx.js
  novafx.min.js
editor-dist/
examples/
effects/
assets/
docs/
```

### Tiêu chí hoàn thành

* Một project Canvas bên ngoài có thể dùng NovaFX chỉ bằng Runtime, effects và assets.
* Editor có thể phát hành độc lập với Runtime.
* Tài liệu đủ để người dùng mới chạy demo và play effect đầu tiên.

### Ghi chú tiến độ

* Trạng thái: `[ ]`
* Ghi chú: Chưa bắt đầu.

---

## 19. Các nguyên tắc kiểm soát trong toàn bộ dự án

Các nguyên tắc này cần được kiểm tra lại sau mỗi phase.

* [ ] Runtime không hardcode effect cụ thể.
* [ ] Effect được mô tả bằng JSON.
* [ ] Runtime và Editor không phụ thuộc hai chiều.
* [ ] Game chỉ dùng public API.
* [ ] Particle không chứa logic gameplay.
* [ ] Emitter không render.
* [ ] Track là cơ chế chung cho property thay đổi theo thời gian.
* [ ] Phase có end condition riêng.
* [ ] Asset chỉ được tham chiếu bằng id trong JSON.
* [ ] Không tạo object không cần thiết trong update / render loop.

---

## 20. Cách cập nhật tiến độ

Khi triển khai, cập nhật tài liệu này theo quy tắc sau:

1. Đổi trạng thái công việc từ `[ ]` sang `[~]` khi bắt đầu.
2. Đổi từ `[~]` sang `[x]` khi đã code xong và kiểm thử đạt tiêu chí.
3. Dùng `[!]` nếu phát hiện blocker hoặc cần quyết định thiết kế.
4. Cập nhật `Ghi chú tiến độ` ở cuối mỗi phase sau khi hoàn thành một mốc lớn.
5. Không đánh dấu phase hoàn thành nếu tiêu chí hoàn thành chưa đạt.

Mẫu ghi chú:

```text
* Trạng thái: `[~]`
* Ghi chú: Đã hoàn thành parser JSON cơ bản, đang kiểm tra cache template khi play nhiều instance.
```

---

## 21. Roadmap tóm tắt

| Phase | Tên | Trạng thái |
| --- | --- | --- |
| 0 | Khởi tạo nền tảng dự án | `[x]` |
| 1 | Runtime Core Skeleton | `[x]` |
| 2 | Effect JSON và Template Cache | `[x]` |
| 3 | Effect Instance và Particle Surface | `[x]` |
| 4 | Emitter System | `[x]` |
| 5 | Particle Model và Object Lifecycle | `[x]` |
| 6 | Track System | `[x]` |
| 7 | Phase System và End Condition | `[x]` |
| 8 | Shape System và Asset Manager | `[x]` |
| 9 | Runtime Rendering và Performance Pass | `[x]` |
| 10 | Runtime Public API | `[x]` |
| 11 | Effect Examples và Preset Library | `[x]` |
| 12 | Editor Foundation | `[x]` |
| 13 | Editor Preview Controls | `[ ]` |
| 14 | Inspector và Track Editor | `[x]` |
| 15 | Asset Panel và Custom Shape Workflow | `[x]` |
| 16 | Packaging, Documentation và Release Candidate | `[ ]` |

---

## 22. Rủi ro cần theo dõi

* JSON format thay đổi quá sớm khi Runtime chưa ổn định.
* Editor phát triển trước Runtime dẫn đến tạo UI cho dữ liệu chưa chắc chắn.
* Track System quá phức tạp ngay từ đầu.
* Particle Surface gây tốn bộ nhớ nếu không giải phóng đúng lifecycle.
* Asset Manager bị trộn trách nhiệm giữa Runtime và Editor.
* Public API lộ quá nhiều chi tiết nội bộ.

---

## 23. Quyết định thiết kế còn mở

* [x] Runtime sẽ viết bằng JavaScript thuần, không dùng TypeScript.
* [x] Editor sẽ dùng JavaScript với React + Vite, tách biệt hoàn toàn khỏi Runtime.
* [x] Runtime để game/demo gọi `update(deltaTime)` và `render()` từ game loop bên ngoài.
* [x] Built-in shape sẽ lấy từ folder `public/img/particleShapes`.
* [ ] Custom asset sẽ được export bằng manifest riêng hay quy ước thư mục?
* [ ] Có cần schema validation chính thức cho Effect JSON không?