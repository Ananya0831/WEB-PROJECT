import java.util.Scanner;

/* =====================================================
   SINGLY LINKED LIST NODE (List ADT)
===================================================== */
class Expense {
    int id;
    String category;
    double amount;
    String date;
    Expense next;

    public Expense(int id, String category, double amount, String date) {
        this.id = id;
        this.category = category;
        this.amount = amount;
        this.date = date;
        this.next = null;
    }
}

/* =====================================================
   STACK IMPLEMENTED USING LINKED LIST
   Used for UNDO DELETE
===================================================== */
class Stack {
    Expense top;

    // Push → O(1)
    public void push(Expense e) {
        e.next = top;
        top = e;
    }

    // Pop → O(1)
    public Expense pop() {
        if (top == null)
            return null;

        Expense temp = top;
        top = top.next;
        temp.next = null;
        return temp;
    }

    public boolean isEmpty() {
        return top == null;
    }
}

/* =====================================================
   MAIN CLASS
===================================================== */
public class ExpensePatternDSA {

    static Expense head = null;
    static Stack deletedStack = new Stack();

    static double income = 0;
    static double wallet = 0;

    /* ===============================
       INSERT AT END 
    =============================== */
    public static void addExpense(int id, String category, double amount, String date) {

        Expense newNode = new Expense(id, category, amount, date);

        if (head == null) {
            head = newNode;
            return;
        }

        Expense temp = head;
        while (temp.next != null)
            temp = temp.next;

        temp.next = newNode;
    }

    /* ===============================
       SEARCH EXPENSE (LINEAR SEARCH )
    =============================== */
    public static Expense searchExpense(int id) {
        Expense temp = head;
        while (temp != null) {
            if (temp.id == id)
                return temp;
            temp = temp.next;
        }
        return null;
    }

    /* ===============================
       Delete expense in SLL
       PUSH TO STACK FOR UNDO
      
    =============================== */
    public static void deleteExpense(int id) {

        if (head == null) {
            System.out.println("No expenses available.");
            return;
        }

        if (head.id == id) {
            Expense deleted = head;
            head = head.next;
            deleted.next = null;
            deletedStack.push(deleted);
            System.out.println("Expense deleted.");
            return;
        }

        Expense prev = head;
        Expense curr = head.next;

        while (curr != null) {
            if (curr.id == id) {
                prev.next = curr.next;
                curr.next = null;
                deletedStack.push(curr);
                System.out.println("Expense deleted.");
                return;
            }
            prev = curr;
            curr = curr.next;
        }

        System.out.println("Expense not found.");
    }

    /* ===============================
       UNDO DELETE (STACK POP)
       
    =============================== */
    public static void undoDelete() {

        if (deletedStack.isEmpty()) {
            System.out.println("Nothing to undo.");
            return;
        }

        Expense restored = deletedStack.pop();
        addExpense(restored.id, restored.category, restored.amount, restored.date);
        System.out.println("Undo successful.");
    }

    /* ===============================
       MERGE SORT 
       Sort by ID
    =============================== */
    public static Expense mergeSort(Expense h) {

        if (h == null || h.next == null)
            return h;

        Expense middle = getMiddle(h);
        Expense nextOfMiddle = middle.next;
        middle.next = null;

        Expense left = mergeSort(h);
        Expense right = mergeSort(nextOfMiddle);

        return sortedMerge(left, right);
    }

    public static Expense sortedMerge(Expense a, Expense b) {

        if (a == null) return b;
        if (b == null) return a;

        Expense result;

        if (a.id <= b.id) {
            result = a;
            result.next = sortedMerge(a.next, b);
        } else {
            result = b;
            result.next = sortedMerge(a, b.next);
        }

        return result;
    }

    public static Expense getMiddle(Expense h) {

        if (h == null) return h;

        Expense slow = h;
        Expense fast = h.next;

        while (fast != null) {
            fast = fast.next;
            if (fast != null) {
                slow = slow.next;
                fast = fast.next;
            }
        }
        return slow;
    }

    /* ===============================
       DASHBOARD
       Traversal 
    =============================== */
    public static void viewDashboard() {

        double totalExpense = 0;
        Expense temp = head;

        while (temp != null) {
            totalExpense += temp.amount;
            temp = temp.next;
        }

        double remaining = income - totalExpense;
        double budgetUsage = (wallet == 0) ? 0 : (totalExpense / wallet) * 100;

        System.out.println("\n===== DASHBOARD =====");
        System.out.println("Total Income      : Rs " + income);
        System.out.println("Total Expense     : Rs " + totalExpense);
        System.out.println("Remaining Balance : Rs " + remaining);
        System.out.println("Budget Usage      : " + budgetUsage + "%");

        /* ===============================
           CATEGORY BREAKDOWN
        =============================== */

        System.out.println("\nCategory Breakdown:");

        String[] categories = new String[100];
        double[] totals = new double[100];
        int catCount = 0;

        temp = head;

        while (temp != null) {

            boolean found = false;

            for (int i = 0; i < catCount; i++) {
                if (categories[i].equalsIgnoreCase(temp.category)) {
                    totals[i] += temp.amount;
                    found = true;
                    break;
                }
            }

            if (!found) {
                categories[catCount] = temp.category;
                totals[catCount] = temp.amount;
                catCount++;
            }

            temp = temp.next;
        }

        for (int i = 0; i < catCount; i++) {
            System.out.println(categories[i] + " : Rs " + totals[i]);
        }
    }

    /* ===============================
       CASHFLOW SUMMARY
      
    =============================== */
    public static void viewCashflow() {

        double totalExpense = 0;
        Expense temp = head;

        while (temp != null) {
            totalExpense += temp.amount;
            temp = temp.next;
        }

        double netBalance = income - totalExpense;

        System.out.println("\n===== CASHFLOW SUMMARY =====");
        System.out.println("----------------------------");
        System.out.println("Total Income    : Rs " + income);
        System.out.println("Total Expense   : Rs " + totalExpense);
        System.out.println("Net Balance     : Rs " + netBalance);

        if (netBalance > 0)
            System.out.println("Status          : Surplus");
        else if (netBalance < 0)
            System.out.println("Status          : Deficit");
        else
            System.out.println("Status          : Break-even");
    }

    /* ===============================
       MAIN MENU
    =============================== */
    public static void main(String[] args) {

        Scanner sc = new Scanner(System.in);
        int choice;

        do {
            System.out.println("\n==== EXPENSE PATTERN SYSTEM ====");
            System.out.println("1. Setup Income");
            System.out.println("2. Setup Wallet Limit");
            System.out.println("3. Add Expense");
            System.out.println("4. Delete Expense");
            System.out.println("5. Undo Delete");
            System.out.println("6. View Dashboard");
            System.out.println("7. View Cashflow");
            System.out.println("8. Search Expense");
            System.out.println("9. Exit");

            System.out.print("Enter choice: ");
            choice = sc.nextInt();

            switch (choice) {

                case 1:
                    System.out.print("Enter Income: ");
                    income = sc.nextDouble();
                    break;

                case 2:
                    System.out.print("Enter Wallet Limit: ");
                    wallet = sc.nextDouble();
                    break;

                case 3:
                    System.out.print("Enter ID: ");
                    int id = sc.nextInt();
                    sc.nextLine();

                    System.out.print("Enter Category: ");
                    String category = sc.nextLine();

                    System.out.print("Enter Amount: ");
                    double amount = sc.nextDouble();
                    sc.nextLine();

                    System.out.print("Enter Date: ");
                    String date = sc.nextLine();

                    addExpense(id, category, amount, date);
                    break;

                case 4:
                    System.out.print("Enter ID to delete: ");
                    deleteExpense(sc.nextInt());
                    break;

                case 5:
                    undoDelete();
                    break;

                case 6:
                    viewDashboard();
                    break;

                case 7:
                    viewCashflow();
                    break;

                case 8:
                    System.out.print("Enter Expense ID to search: ");
                    Expense found = searchExpense(sc.nextInt());

                    if (found != null) {
                        System.out.println("Expense Found:");
                        System.out.println("ID: " + found.id);
                        System.out.println("Category: " + found.category);
                        System.out.println("Amount: Rs " + found.amount);
                        System.out.println("Date: " + found.date);
                    } else {
                        System.out.println("Expense not found.");
                    }
                    break;

                case 9:
                    System.out.println("Exiting...");
                    break;

                default:
                    System.out.println("Invalid choice.");
            }

        } while (choice != 0);

        sc.close();
    }
}