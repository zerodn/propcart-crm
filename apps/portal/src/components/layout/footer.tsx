export default function SiteFooter() {
  return (
    <footer className="bg-gray-900 text-gray-300 pt-12 pb-6">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-1 md:col-span-1">
            <p className="text-white font-bold text-xl mb-3">PropCart</p>
            <p className="text-sm leading-relaxed">
              Nền tảng quản lý và trưng bày dự án bất động sản chuyên nghiệp.
            </p>
          </div>

          {/* Company */}
          <div>
            <p className="text-white font-semibold mb-3 text-sm">Công ty</p>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white transition">Về chúng tôi</a></li>
              <li><a href="#" className="hover:text-white transition">Lĩnh vực hoạt động</a></li>
              <li><a href="#" className="hover:text-white transition">Đối tác / Khách hàng</a></li>
              <li><a href="#" className="hover:text-white transition">Tin tức / Sự kiện</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <p className="text-white font-semibold mb-3 text-sm">Hỗ trợ</p>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white transition">Trung tâm hỗ trợ</a></li>
              <li><a href="#" className="hover:text-white transition">Điều khoản dịch vụ</a></li>
              <li><a href="#" className="hover:text-white transition">Pháp lý</a></li>
              <li><a href="#" className="hover:text-white transition">Chính sách bảo mật</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p className="text-white font-semibold mb-3 text-sm">Liên hệ</p>
            <ul className="space-y-2 text-sm">
              <li>Kinh doanh: <a href="tel:0977487777" className="hover:text-white transition">0977 48 7777</a></li>
              <li>Tuyển dụng: <a href="tel:0931129988" className="hover:text-white transition">093 112 9988</a></li>
              <li>Email: <a href="mailto:info@propcart.vn" className="hover:text-white transition">info@propcart.vn</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">© PropCart CRM {new Date().getFullYear()}. All rights reserved.</p>
          <div className="flex gap-4 text-xs text-gray-500">
            <a href="#" className="hover:text-white transition">Facebook</a>
            <a href="#" className="hover:text-white transition">YouTube</a>
            <a href="#" className="hover:text-white transition">LinkedIn</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
