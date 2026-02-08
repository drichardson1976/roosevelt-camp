# Roosevelt Camp - Workflow Diagrams (Mermaid)

## Version History Timeline

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#10b981','primaryTextColor':'#fff','primaryBorderColor':'#059669','lineColor':'#6366f1','secondaryColor':'#3b82f6','tertiaryColor':'#f59e0b'}}}%%
timeline
    title Roosevelt Camp Version History (Recent Releases)

    Feb 8, 2026
        : v12.167 : Admin Dashboard Bug Fix

    Feb 7, 2026
        : v12.162 : Parent Dashboard Simplification
        : v12.160 : Multi-Parent Family Access
        : v12.159 : Sessions Tab Restructuring
        : v12.158 : Gym Rental Days Expansion
        : v12.157 : Gym Rental Days Admin Tab
        : v12.156 : Session Calendar Payment Status
        : v12.155 : Legend Positioning
        : v12.154 : Calendar Legend Update
        : v12.153 : Calendar Bug Fix
        : v12.152 : Photo Cropper & Camp Dates
        : v12.151 : Parent Dashboard Sessions Tab
        : v12.150 : Campers Tab Simplification
```

## Parent User Journey

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#10b981','primaryTextColor':'#fff'}}}%%
graph TD
    Start([Visit Site]) --> Login[Login Page]
    Login --> NewUser{New User?}
    NewUser -->|Yes| CreateAccount[Click 'Create Account']
    NewUser -->|No| SignIn[Sign In]

    CreateAccount --> SelectRole[Select Role: Parent]
    SelectRole --> Onboarding[6-Step Onboarding]

    Onboarding --> Step1[Step 1: Account Info<br/>Name, Email, Phone, Password]
    Step1 --> Step2[Step 2: Add Campers<br/>Name, Birthdate, Grade]
    Step2 --> Step3[Step 3: Emergency Contacts<br/>Min 3, at least 1 non-parent]
    Step3 --> Step4[Step 4: Payment Info<br/>Credit Card Details]
    Step4 --> Step5[Step 5: Policies REQUIRED<br/>Accept Drop-off & Pick-up]
    Step5 --> Step6[Step 6: Review & Complete]

    Step6 --> Dashboard[Parent Dashboard]
    SignIn --> Dashboard

    Dashboard --> DashTabs{Choose Tab}
    DashTabs -->|Dashboard| ViewPayment[View Payment & Next Steps]
    DashTabs -->|My Campers| ManageCampers[Manage Camper Profiles]
    DashTabs -->|Emergency| ManageContacts[Manage Emergency Contacts]
    DashTabs -->|Session Registration| Register[Register for Camp]
    DashTabs -->|Messages| ViewMessages[View Admin Messages]

    Register --> SelectCamper[Select Camper]
    SelectCamper --> SelectDates[Select Dates & Sessions]
    SelectDates --> Summary[Order Summary<br/>Calculate Total with Discounts]
    Summary --> Submit[Submit Registration]
    Submit --> Pending[Status: Pending Approval]

    Pending --> AdminApprove{Admin Approves?}
    AdminApprove -->|Yes| Approved[Status: Approved]
    AdminApprove -->|No| Rejected[Status: Rejected]

    Approved --> ViewPod[View Pod Assignment<br/>Counselor & Pod Mates]

    style Step5 fill:#f59e0b
    style Approved fill:#10b981
    style Rejected fill:#ef4444
```

## Counselor User Journey

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#3b82f6','primaryTextColor':'#fff'}}}%%
graph TD
    Start([Visit Site]) --> Login[Login Page]
    Login --> CreateAccount[Create Account]
    CreateAccount --> SelectRole[Select Role: Counselor]

    SelectRole --> Onboarding[5-Step Onboarding]

    Onboarding --> C1[Step 1: Account Info<br/>Name, Email, Phone, Password]
    C1 --> C2[Step 2: Profile Info<br/>Photo, Position, Year, Bio]
    C2 --> C3[Step 3: Availability<br/>Mark Available Sessions]
    C3 --> C4[Step 4: Responsibilities & Pay<br/>Accept Terms]
    C4 --> C5[Step 5: Review & Submit]

    C5 --> PendingApproval[Status: Pending Approval]

    PendingApproval --> AdminReview{Admin Reviews}
    AdminReview -->|Approve| ApprovedCounselor[Status: Approved<br/>Visible on Website]
    AdminReview -->|Reject| AccountDeleted[Account Deleted]

    ApprovedCounselor --> AdminSchedule[Admin Sets Eligible Sessions]
    AdminSchedule --> PodAssignment[Admin Assigns to Pods]

    PodAssignment --> CounselorDash[Counselor Dashboard]

    CounselorDash --> CTabs{Choose Tab}
    CTabs -->|Dashboard| UpdateAvail[Update Availability<br/>3-State: Available/Unavailable/Unset]
    CTabs -->|My Schedule| ViewAssignments[View Pod Assignments<br/>See Assigned Campers]

    style PendingApproval fill:#f59e0b
    style ApprovedCounselor fill:#10b981
    style AccountDeleted fill:#ef4444
```

## Admin Workflow - 5 Phases

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#8b5cf6','primaryTextColor':'#fff'}}}%%
graph TD
    Start([Admin Login]) --> AdminDash[Admin Dashboard]

    AdminDash --> Phase1[PHASE 1: Setup]
    Phase1 --> Content[Content Tab:<br/>Set camp info, pricing,<br/>Venmo, contact details]
    Content --> GymRentals[Gym Rentals Tab:<br/>Mark gym booked days]
    GymRentals --> Sessions[Sessions Tab:<br/>Block unavailable dates]

    Sessions --> Phase2[PHASE 2: Approve People]
    Phase2 --> ApprovalTab[Approval Tab]
    ApprovalTab --> ApproveCounselors[Review Counselor Applications<br/>Approve or Reject]
    ApprovalTab --> ApproveRegs[Review Parent Registrations<br/>Check Payment & Approve]

    ApproveRegs --> Phase3[PHASE 3: Set Counselor Schedules]
    Phase3 --> CounselorsTab[Counselors Tab:<br/>Edit Schedule for Each Counselor]
    CounselorsTab --> MarkEligible[Mark Sessions Where<br/>Counselor is Eligible]

    MarkEligible --> Phase4[PHASE 4: Build Pods]
    Phase4 --> AssignmentsTab[Assignments Tab:<br/>Select Date + Session]
    AssignmentsTab --> DragDrop[Drag & Drop:<br/>1 Counselor + up to 5 Campers]
    DragDrop --> CreatePods[Create Multiple Pods<br/>for Same Session]

    CreatePods --> Phase5[PHASE 5: Ongoing Management]
    Phase5 --> Monitor[Monitor Registrations,<br/>Manage Parents/Campers,<br/>View History]

    style Phase1 fill:#10b981
    style Phase2 fill:#3b82f6
    style Phase3 fill:#f59e0b
    style Phase4 fill:#ec4899
    style Phase5 fill:#8b5cf6
```

## Registration Lifecycle State Diagram

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#3b82f6'}}}%%
stateDiagram-v2
    [*] --> Pending: Parent Submits<br/>Registration

    Pending --> Approved: Admin Approves &<br/>Marks Paid
    Pending --> Rejected: Admin Rejects

    Approved --> PodAssigned: Admin Assigns<br/>to Pod
    Approved --> Cancelled: Parent/Admin<br/>Cancels

    PodAssigned --> Cancelled: Parent/Admin<br/>Cancels

    Rejected --> [*]
    Cancelled --> [*]

    note right of Pending
        Payment Status: Unpaid
        Spot NOT confirmed
    end note

    note right of Approved
        Payment Status: Paid
        Spot confirmed
        Can be assigned to pod
    end note

    note right of PodAssigned
        Parent can view:
        - Counselor
        - Pod mates
    end note
```

## System Integration - How All Three Roles Connect

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#10b981'}}}%%
sequenceDiagram
    participant P as Parent
    participant A as Admin
    participant C as Counselor
    participant S as System

    Note over P,C: PHASE 1: Account Creation
    P->>S: Create account & add campers
    C->>S: Create account & set availability

    Note over P,C: PHASE 2: Admin Approval
    C->>A: Application pending approval
    A->>S: Approve counselor (visible=true)
    S->>C: Profile appears on website

    Note over P,C: PHASE 3: Counselor Schedule
    A->>S: Mark counselor eligible sessions

    Note over P,C: PHASE 4: Registration
    P->>S: Register camper for dates/sessions
    P->>A: Registration submitted
    A->>A: Check payment via Venmo
    A->>S: Approve registration & mark paid
    S->>P: Spot confirmed

    Note over P,C: PHASE 5: Pod Creation
    A->>S: Build pods (assign counselor + campers)
    S->>P: Pod assignment visible
    S->>C: Pod assignment visible

    Note over P,C: PHASE 6: View Assignments
    P->>S: View counselor & pod mates
    C->>S: View assigned campers
```

## Admin Dashboard Tab Structure

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#8b5cf6'}}}%%
graph LR
    Admin[Admin Dashboard] --> ParentTabs[Parent Tabs]
    Admin --> ChildTabs[Child Tabs]

    ParentTabs --> Dashboard[📊 Dashboard]
    ParentTabs --> Family[👨‍👩‍👧 Family Setup]
    ParentTabs --> Counselor[🏀 Counselor Setup]
    ParentTabs --> Registrations[✅ Registrations]
    ParentTabs --> Pod[📋 Pod Setup]
    ParentTabs --> Camp[⚙️ Camp Setup]
    ParentTabs --> History[📜 History]
    ParentTabs --> Danger[⚠️ Danger Zone]

    Family --> FamChildren{Children}
    FamChildren --> Parents[Parents]
    FamChildren --> Campers[Campers]
    FamChildren --> SessionRegs[Session Registrations]

    Counselor --> CounChildren{Children}
    CounChildren --> CounselorsList[Counselors]
    CounChildren --> Availability[Work Availability]

    Pod --> PodChildren{Children}
    PodChildren --> Assignments[Counselor & Camper<br/>Assignments]

    Camp --> CampChildren{Children}
    CampChildren --> GymRentals[Gym Rental Days]
    CampChildren --> Content[Public Website Content]

    style Family fill:#10b981
    style Counselor fill:#3b82f6
    style Pod fill:#ec4899
    style Camp fill:#f59e0b
```

## Payment Flow

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#10b981'}}}%%
graph TD
    Start([Registration Approved]) --> ParentDash[Parent Dashboard<br/>Shows Amount Due<br/>& Unique Venmo Code]

    ParentDash --> ParentPays[Parent Pays via Venmo<br/>Includes Code in Payment]

    ParentPays --> AdminCheck[Admin Checks Venmo<br/>Finds Payment with Code]

    AdminCheck --> TogglePaid[Admin Toggles<br/>Payment Status to 'Paid']

    TogglePaid --> Options{Where?}
    Options --> RegTab[Registrations Tab<br/>Inline Toggle]
    Options --> Modal[Registration Detail<br/>Modal]
    Options --> ApprovalTab[Approval Tab<br/>During Approval]

    RegTab --> Updated[Parent Dashboard Updates]
    Modal --> Updated
    ApprovalTab --> Updated

    Updated --> ShowPaid[Shows 'Paid' Badge<br/>Green Status]

    style ParentPays fill:#f59e0b
    style ShowPaid fill:#10b981
```

## Camper Registration Flow Detail

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#10b981'}}}%%
flowchart TD
    Start([Parent: Session Registration Tab]) --> NewReg[Click '+New Registration']

    NewReg --> CheckCampers{Has Campers?}
    CheckCampers -->|No| Warning1[⚠️ Yellow Warning:<br/>Add Campers First]
    CheckCampers -->|Yes| Step1[Step 1: Select Camper]

    Warning1 --> GoToCampers[Go to My Campers Tab]

    Step1 --> SingleCamper{Only 1 Camper?}
    SingleCamper -->|Yes| AutoSelect[Auto-Select Camper]
    SingleCamper -->|No| MultiSelect[Multi-Select Campers]

    AutoSelect --> Step2
    MultiSelect --> Step2[Step 2: Select Dates & Sessions]

    Step2 --> ClickDates[Click Calendar Days<br/>☀️ AM & 🌙 PM Buttons]
    ClickDates --> BulkActions{Bulk Actions?}
    BulkActions -->|Yes| WholeWeek[Add Whole Week Button]
    BulkActions -->|Yes| BothSessions[Select Both Sessions Button]
    BulkActions -->|No| Individual[Individual Session Selection]

    WholeWeek --> Calculate
    BothSessions --> Calculate
    Individual --> Calculate[Calculate Total]

    Calculate --> Discounts{Full Week<br/>Selected?}
    Discounts -->|Yes| Apply10[Apply 10% Discount]
    Discounts -->|No| NoDiscount[Regular Pricing<br/>$60/session]

    Apply10 --> Summary
    NoDiscount --> Summary[Step 3: Order Summary]

    Summary --> Submit[Submit Registration]
    Submit --> Modal[✅ Confirmation Modal<br/>Executive Summary<br/>& Next Steps]

    Modal --> PendingApproval[Status: Pending<br/>⚠️ Not Confirmed Until:<br/>✓ Payment Received<br/>✓ Admin Approves]

    style Warning1 fill:#f59e0b
    style Apply10 fill:#10b981
    style Modal fill:#3b82f6
```

---

## Notes

- All diagrams use Mermaid syntax and render in GitHub, VS Code (with extensions), and many documentation platforms
- Timeline shows most recent versions (Feb 7-8, 2026)
- State diagrams show registration lifecycle states
- Sequence diagrams illustrate cross-role interactions
- Flowcharts detail user journeys for each role

*Generated from WORKFLOWS.md - Roosevelt Camp Management System*
