import java.util.ArrayList;
import java.util.Scanner;

public class LibraryManager {

    // ==================== Lớp Book ====================
    static class Book {
        private String title;
        private String author;
        private int totalCopies;
        private int availableCopies;

        public Book(String title, String author, int totalCopies) {
            this.title = title;
            this.author = author;
            this.totalCopies = totalCopies;
            this.availableCopies = totalCopies;
        }

        public String getTitle() { return title; }
        public String getAuthor() { return author; }
        public int getTotalCopies() { return totalCopies; }
        public int getAvailableCopies() { return availableCopies; }

        public boolean borrowBook() {
            if (availableCopies > 0) {
                availableCopies--;
                return true;
            }
            return false;
        }

        public void returnBook() {
            if (availableCopies < totalCopies) {
                availableCopies++;
            }
        }

        @Override
        public String toString() {
            return String.format("  Title: %s | Author: %s | Available: %d/%d",
                    title, author, availableCopies, totalCopies);
        }
    }

    // ==================== Lớp Library ====================
    static class Library {
        private String name;
        private ArrayList<Book> books;

        public Library(String name) {
            this.name = name;
            this.books = new ArrayList<>();
        }

        public String getName() { return name; }
        public int getBookCount() { return books.size(); }
        public ArrayList<Book> getBooks() { return books; }

        public void addBook(Book book) {
            books.add(book);
        }

        public ArrayList<Book> searchByTitle(String keyword) {
            ArrayList<Book> results = new ArrayList<>();
            for (Book book : books) {
                if (book.getTitle().toLowerCase().contains(keyword.toLowerCase())) {
                    results.add(book);
                }
            }
            return results;
        }

        public Book findExactTitle(String title) {
            for (Book book : books) {
                if (book.getTitle().equalsIgnoreCase(title)) {
                    return book;
                }
            }
            return null;
        }
    }

    // ==================== Chương trình chính ====================
    private static Library library;
    private static Scanner scanner;

    public static void main(String[] args) {
        scanner = new Scanner(System.in);
        library = new Library("My Small Library");

        // Thêm sẵn một số sách mẫu
        library.addBook(new Book("Java Programming", "James Gosling", 5));
        library.addBook(new Book("Clean Code", "Robert C. Martin", 3));
        library.addBook(new Book("Design Patterns", "Gang of Four", 2));
        library.addBook(new Book("The Pragmatic Programmer", "Andrew Hunt", 4));
        library.addBook(new Book("Introduction to Algorithms", "Thomas H. Cormen", 3));
        library.addBook(new Book("The Mythical Man-Month", "Frederick P. Brooks", 2));
        library.addBook(new Book("Refactoring", "Martin Fowler", 3));
        library.addBook(new Book("Code Complete", "Steve McConnell", 4));
        library.addBook(new Book("Head First Java", "Kathy Sierra", 5));
        library.addBook(new Book("Effective Java", "Joshua Bloch", 3));
        library.addBook(new Book("Computer Networks", "Andrew S. Tanenbaum", 2));
        library.addBook(new Book("Operating System Concepts", "Abraham Silberschatz", 3));

        int choice;
        do {
            showMenu();
            choice = getIntInput("Enter menu ID (1-6): ");
            System.out.println();

            switch (choice) {
                case 1: showLibraryInfo(); break;
                case 2: addNewBook(); break;
                case 3: findBook(); break;
                case 4: borrowBook(); break;
                case 5: returnBook(); break;
                case 6:
                    System.out.println(">> Goodbye! Thank you for using the Library Manager.");
                    break;
                default:
                    System.out.println(">> Invalid choice! Please enter a number from 1 to 6.");
            }
            System.out.println();
        } while (choice != 6);

        scanner.close();
    }

    // --------- Hiển thị menu ---------
    private static void showMenu() {
        System.out.println("========= Main menu =========");
        System.out.println("1. Show library information");
        System.out.println("2. Add new book");
        System.out.println("3. Find book");
        System.out.println("4. Borrow a book");
        System.out.println("5. Return a book");
        System.out.println("6. Exit");
        System.out.println("=============================");
    }

    // --------- 1. Xem thông tin thư viện ---------
    private static void showLibraryInfo() {
        System.out.println("--- Library Information ---");
        System.out.println("  Name: " + library.getName());
        System.out.println("  Total book titles: " + library.getBookCount());
        System.out.println("  Book list:");
        if (library.getBooks().isEmpty()) {
            System.out.println("    (No books available)");
        } else {
            int idx = 1;
            for (Book book : library.getBooks()) {
                System.out.println("    " + idx + ". " + book.getTitle());
                idx++;
            }
        }
    }

    // --------- 2. Thêm đầu sách mới ---------
    private static void addNewBook() {
        System.out.println("--- Add New Book ---");
        System.out.print("  Enter book title: ");
        String title = scanner.nextLine().trim();
        if (title.isEmpty()) {
            System.out.println(">> Book title cannot be empty!");
            return;
        }

        // Kiểm tra trùng tên
        if (library.findExactTitle(title) != null) {
            System.out.println(">> A book with this title already exists!");
            return;
        }

        System.out.print("  Enter author name: ");
        String author = scanner.nextLine().trim();
        if (author.isEmpty()) {
            System.out.println(">> Author name cannot be empty!");
            return;
        }

        int copies = getIntInput("  Enter number of copies: ");
        if (copies <= 0) {
            System.out.println(">> Number of copies must be greater than 0!");
            return;
        }

        library.addBook(new Book(title, author, copies));
        System.out.println(">> Book \"" + title + "\" added successfully!");
    }

    // --------- 3. Tìm kiếm sách ---------
    private static void findBook() {
        System.out.println("--- Find Book ---");
        System.out.print("  Enter search keyword: ");
        String keyword = scanner.nextLine().trim();
        if (keyword.isEmpty()) {
            System.out.println(">> Search keyword cannot be empty!");
            return;
        }

        ArrayList<Book> results = library.searchByTitle(keyword);
        if (results.isEmpty()) {
            System.out.println(">> No books found matching \"" + keyword + "\".");
        } else {
            System.out.println(">> Found " + results.size() + " book(s):");
            for (Book book : results) {
                System.out.println(book);
            }
        }
    }

    // --------- 4. Mượn sách ---------
    private static void borrowBook() {
        System.out.println("--- Borrow a Book ---");
        System.out.print("  Enter the book title to borrow: ");
        String title = scanner.nextLine().trim();

        Book book = library.findExactTitle(title);
        if (book == null) {
            System.out.println(">> Book \"" + title + "\" not found in library!");
            return;
        }

        if (book.borrowBook()) {
            System.out.println(">> Successfully borrowed \"" + book.getTitle() + "\".");
            System.out.println("   Remaining copies: " + book.getAvailableCopies() + "/" + book.getTotalCopies());
        } else {
            System.out.println(">> Sorry, no copies of \"" + book.getTitle() + "\" are available right now.");
        }
    }

    // --------- 5. Trả sách ---------
    private static void returnBook() {
        System.out.println("--- Return a Book ---");
        System.out.print("  Enter the book title to return: ");
        String title = scanner.nextLine().trim();

        Book book = library.findExactTitle(title);
        if (book == null) {
            System.out.println(">> Book \"" + title + "\" not found in library!");
            return;
        }

        if (book.getAvailableCopies() >= book.getTotalCopies()) {
            System.out.println(">> All copies of \"" + book.getTitle() + "\" are already in the library.");
            return;
        }

        book.returnBook();
        System.out.println(">> Successfully returned \"" + book.getTitle() + "\".");
        System.out.println("   Current copies: " + book.getAvailableCopies() + "/" + book.getTotalCopies());
    }

    // --------- Hàm tiện ích đọc số nguyên ---------
    private static int getIntInput(String prompt) {
        System.out.print(prompt);
        while (true) {
            String line = scanner.nextLine().trim();
            try {
                return Integer.parseInt(line);
            } catch (NumberFormatException e) {
                System.out.print(">> Invalid input! Please enter a number: ");
            }
        }
    }
}
