const fs = require('fs');

const DB_PATH = 'C:\\Users\\GHC\\AppData\\Roaming\\Cursor\\User\\globalStorage\\state.vscdb';

console.log('\n╔══════════════════════════════════════════════════════╗');
console.log('║          CURSOR ACCESS TOKENS EXTRACTOR              ║');
console.log('╚══════════════════════════════════════════════════════╝\n');

try {
    const data = fs.readFileSync(DB_PATH);
    const content = data.toString('utf8', 0, data.length);

    console.log(`📁 Database: ${DB_PATH}`);
    console.log(`📊 File size: ${data.length} bytes\n`);
    console.log('🔍 Đang tìm JWT tokens...\n');

    const jwtPattern = /eyJ[a-zA-Z0-9_\-]+\.eyJ[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+/g;
    const tokens = content.match(jwtPattern);

    if (tokens && tokens.length > 0) {
        const unique = [...new Set(tokens)];

        unique.slice(0, 3).forEach((token, idx) => {
            console.log('╔═══════════════════════════════════════════════════════════════════════════════╗');
            console.log(`║ TOKEN ${idx + 1}                                                                       ║`);
            console.log('╚═══════════════════════════════════════════════════════════════════════════════╝\n');
            console.log(token);
            console.log();

            try {
                const parts = token.split('.');
                const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());

                console.log(`👤 User: ${payload.sub || 'N/A'}`);

                if (payload.exp) {
                    const expDate = new Date(payload.exp * 1000);
                    const now = new Date();
                    const isExpired = expDate < now;
                    console.log(`⏰ Expires: ${expDate.toISOString()} ${isExpired ? '(EXPIRED)' : '(VALID)'}`);
                }

                console.log();
            } catch (e) {
                console.log('⚠️  Cannot decode token\n');
            }
        });

        console.log('═══════════════════════════════════════════════════════════════════════════════════\n');
        console.log(`✅ Tìm thấy ${unique.length} token(s) (hiển thị tối đa 3)\n`);
    } else {
        console.log('❌ Không tìm thấy JWT token nào trong database.\n');
    }

} catch (e) {
    console.error('❌ Lỗi:', e.message);
}
