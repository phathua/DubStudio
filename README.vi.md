<div align="center">
  <img src="public/logo.png" alt="Biểu tượng DubStudio" width="96" />
  <h1>DubStudio</h1>
  <p>Không gian làm việc cho dự án lồng tiếng.</p>
</div>

DubStudio là ứng dụng mã nguồn mở dành cho macOS và Windows. Phiên bản hiện tại có quản lý dự án, xem trước media, chỉnh nhân vật và lời thoại, cùng tùy chọn dịch từng đoạn bằng Google AI Studio.

**Đang phát triển:** nhận diện giọng nói, tự nhận diện nhân vật, dịch cục bộ, tổng hợp giọng, tách âm, chỉnh clip trên timeline và xuất video chưa được triển khai. Xem [lộ trình](docs/ROADMAP.md) và [danh sách model](docs/MODELS.md).

## Chạy ứng dụng

Cài Node.js 24, pnpm 11, Rust và [các công cụ Tauri](https://v2.tauri.app/start/prerequisites/), sau đó chạy:

```sh
pnpm install --frozen-lockfile
pnpm tauri dev
```

Có thể nhấp đúp `Dev.command` trên macOS hoặc `Dev.bat` trên Windows. Để build và cài, dùng tệp `Build and Install` tương ứng hệ điều hành. Bản ứng dụng chưa được ký và notarize.

## Dịch bằng Google

Tính năng chỉ gửi đoạn thoại tới Google sau khi người dùng xác nhận. Google có thể dùng dữ liệu gói miễn phí để cải thiện sản phẩm; hạn mức và giá có thể thay đổi. Xem [chính sách và bảng giá của Google](https://ai.google.dev/gemini-api/docs/pricing).

Đặt `GOOGLE_API_KEY` trong biến môi trường của tiến trình ứng dụng. Chỉ trong chế độ phát triển, ứng dụng có thể đọc biến này từ `.env` ở thư mục dự án. Tệp được Git bỏ qua nhưng là văn bản thuần: cần bảo vệ, không chia sẻ hoặc đưa khóa vào mã frontend. Bản release không đọc `.env`; hỗ trợ Keychain/Credential Manager đang được lên kế hoạch.

## Dự án và kiểm thử

Dự án mới dùng đuôi `.dub`. Có thể mở `.dubstudio` cũ và lưu thành bản `.dub` mới mà vẫn giữ tệp cũ. Media được tham chiếu tại vị trí gốc.

```sh
pnpm build
pnpm test
cargo test --manifest-path src-tauri/Cargo.toml
```

Xem [README tiếng Anh](README.md) để biết thêm. Mã DubStudio theo giấy phép [MIT](LICENSE); model, giọng và runtime bên thứ ba có thể có điều kiện riêng.
