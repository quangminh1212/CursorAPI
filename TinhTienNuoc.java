import java.util.Scanner;

public class TinhTienNuoc {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);

        System.out.print("Nhap so nuoc tieu thu (m3): ");
        int soNuoc = sc.nextInt();

        if (soNuoc < 0) {
            System.out.println("So nuoc tieu thu khong hop le!");
            sc.close();
            return;
        }

        double tienNuoc = 0;

        if (soNuoc <= 10) {
            tienNuoc = soNuoc * 5973.0;
        } else if (soNuoc <= 20) {
            tienNuoc = 10 * 5973.0 + (soNuoc - 10) * 7052.0;
        } else if (soNuoc <= 30) {
            tienNuoc = 10 * 5973.0 + 10 * 7052.0 + (soNuoc - 20) * 8669.0;
        } else {
            tienNuoc = 10 * 5973.0 + 10 * 7052.0 + 10 * 8669.0 + (soNuoc - 30) * 15929.0;
        }

        // Cong them 5% thue GTGT
        double tongTien = tienNuoc * 1.05;

        System.out.printf("Tien nuoc (chua thue): %.0f dong%n", tienNuoc);
        System.out.printf("Thue GTGT (5%%):        %.0f dong%n", tienNuoc * 0.05);
        System.out.printf("Tong tien phai tra:     %.0f dong%n", tongTien);

        sc.close();
    }
}
