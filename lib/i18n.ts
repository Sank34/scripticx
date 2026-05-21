export const translations = {
  en: {
    sidebar: {
      platform: "Platform",
      learn: "Learn",
    },

    nav: {
      editor: "Editor",
      livecode: "Live Code",
      problems: "Problems",
      leaderboard: "Leaderboard",
      feed: "Feed",
      dashboard: "Dashboard",
      search: "Search",
      admin: "Admin",
      docs: "Docs",
      examples: "Examples",
      classes: "Classes",
      whatsNew: "What's new",
      help: "Help",
      contact: "Contact",
    },

    mobileDrawer: {
      title: "Mobile navigation",
      subtitle: "Platform navigation",
      open: "Open mobile navigation",
    },

    learn: {
      docs: "Docs",
      pages: {
        introduction: "Introduction",
        basics: "Basics",
        variables: "Variables",
        loops: "Loops",
        io: "Input / Output",
      },

      basics: "Basics",
      variables: "Variables",
      loops: "Loops",
      inputOutput: "Input / Output",

      title: "MiniScript+ Documentation",
      subtitle: "Learn how to use MiniScript+ step by step with examples and explanations.",

      sections: {
        what: {
          title: "What is MiniScript+?",
          text: "MiniScript+ is a simple interpreted language designed to help you learn programming logic. It focuses on clarity and step-by-step execution.",
        },
        example: {
          title: "Example",
        },
        how: {
          title: "How it works",
          bullets: [
            "Code is executed line by line",
            "Variables store values",
            "Loops repeat logic",
            "Input/Output lets you interact with programs",
          ],
        },
      },
      basicsPage: {
        title: "Basics",
        subtitle: "Learn the fundamental building blocks of MiniScript+.",
        sections: {
          statements: {
            title: "Statements",
            text: "A program is made of statements executed from top to bottom."
          },
          variables: {
            title: "Variables",
            text: "Variables store values that you can use later."
          },
          math: {
            title: "Math Operations",
            text: "You can perform calculations using operators."
          },
          conditions: {
            title: "Conditions",
            text: "Use IF statements to control program flow."
          }
        }
      },
      variablesPage: {
        title: "Variables",
        subtitle: "Variables store values that can be used and modified throughout your program.",
        sections: {
          what: {
            title: "What is a Variable?",
            text: "A variable is a named container that holds a value."
          },
          using: {
            title: "Using Variables",
            text: "Once a variable is created, you can use it in expressions."
          },
          updating: {
            title: "Updating Variables",
            text: "You can change the value of a variable anytime."
          },
          types: {
            title: "Variable Types",
            text: "MiniScript+ supports different types of values:",
            bullets: [
              "Numbers → 10, 3.14",
              "Strings → \"Hello\"",
              "Booleans → true, false"
            ]
          },
          naming: {
            title: "Naming Variables",
            text: "Variable names should be clear and meaningful.",
            note: "Avoid using spaces or special characters."
          }
        }
      },
      loopsPage: {
        title: "Loops",
        subtitle: "Loops allow you to repeat a block of code multiple times.",
        sections: {
          while: {
            title: "WHILE Loop",
            text: "A WHILE loop runs as long as a condition is true."
          },
          how: {
            title: "How it works",
            bullets: [
              "The condition is checked before each iteration",
              "If true → the loop runs",
              "If false → the loop stops"
            ]
          },
          example: {
            title: "Example Explained",
            output: "Output will be:"
          },
          infinite: {
            title: "Infinite Loops",
            text: "If the condition never becomes false, the loop will run forever.",
            note: "Be careful — this will never stop unless manually interrupted."
          },
          mistake: {
            title: "Common Mistake",
            text: "Forgetting to update the variable inside the loop.",
            warning: "This will cause an infinite loop"
          }
        }
      },
      inputOutputPage: {
        title: "Input / Output",
        subtitle: "Programs interact with users through input and output.",
        sections: {
          output: {
            title: "Output (PRINT)",
            text: "Use PRINT to display values or text."
          },
          variables: {
            title: "Using Variables in Output"
          },
          input: {
            title: "Input (INPUT)",
            text: "INPUT allows the program to receive a value from the user."
          },
          example: {
            title: "Example",
            text: "The program asks for two values and prints their sum."
          },
          how: {
            title: "How INPUT works",
            bullets: [
              "The program pauses and waits for input",
              "The value is stored in a variable",
              "Execution continues after input is provided"
            ]
          },
          types: {
            title: "Types of Input",
            text: "The input value can be:",
            bullets: [
              "Number → 10",
              "Text → Hello",
              "Boolean → true / false"
            ]
          },
          mistake: {
            title: "Common Mistake",
            note: "Make sure the input is a number if you want to perform math."
          }
        }
      },
    },

    user: {
      profile: "Profile",
      settings: "Settings",
      logout: "Log out",
      login: "Login",
      user: "User",
      language: "Language",
    },

    editor: {
      title: "MiniScript+ Editor",
      placeholderTitle: "Title",
      placeholderDescription: "Description",

      actions: {
        newSnippet: "New snippet",
        compile: "Compile code",
        step: "Step execution",
        run: "Run program",
        download: "Download .msp",
        save: "Save snippet",
        update: "Update snippet",
        share: "Share snippet",
      },

      complexity: {
        title: "Complexity Analyzer",
        empty: "Run the analyzer to estimate time complexity, space complexity and optimization score.",
        warnings: "Warnings",
        suggestions: "Suggestions",
        actions: {
          analyze: "Analyze complexity",
          rerun: "Re-run complexity analysis",
        },
        metrics: {
          time: "Time",
          space: "Space",
          loops: "Loops",
          maxNesting: "Max nesting",
        },
        levels: {
          excellent: "excellent",
          good: "good",
          average: "average",
          poor: "poor",
        },
        toast: {
          completed: "Complexity analysis completed",
        },
      },

      debugger: {
        title: "Debugger",
        variables: "Variables",
        currentLine: "Current Line",
        output: "Output",
        input: "Enter value for",
        submit: "Submit",
      },

      snippets: {
        title: "My Snippets",
        empty: "No snippets yet",
        untitled: "Untitled",
        edit: "Edit snippet",
        delete: "Delete snippet",
      },

      toast: {
        savedFile: "Saved file!",
        saveError: "Failed to save file",
        snippetSaved: "Snippet saved",
        snippetSaveError: "Failed to save snippet",
        copied: "Link copied!",
        deleteError: "Failed to delete snippet",
        deleted: "Snippet deleted",
      }
    },

    snippetPage: {
      notFound: "Snippet not found",
      untitled: "Untitled",
      unknownUser: "Unknown",
      shared: "Shared a snippet",
      public: "Public",

      actions: {
        copy: "Copy",
        share: "Share",
        openEditor: "Open Editor",
      },

      code: {
        title: "Code",
      },

      toast: {
        codeCopied: "Code copied!",
        copyError: "Failed to copy code",
        linkCopied: "Link copied!",
        linkError: "Failed to copy link",
      }
    },

    problems: {
      title: "Problems",
      searchPlaceholder: "Search problems...",

      filters: {
        all: "All",
        easy: "Easy",
        medium: "Medium",
        hard: "Hard",
      },

      status: {
        solved: "Solved",
        notStarted: "Not started",
      }
    },

    problemPage: {
      notFound: "Problem not found",

      actions: {
        submit: "Submit",
      },

      result: {
        score: "Score",
        error: "ERROR",
      },

      tests: {
        test: "Test",
        input: "Input",
        expected: "Expected",
        got: "Got",
      }
    },

    leaderboard: {
      title: "Leaderboard",
      description: "Top users ranked by total score",
      points: "pts",
    },

    dashboard: {
      title: "Dashboard",
      overview: "Overview",
      stats: {
        solved: "Problems solved",
        score: "Total score",
        streak: "Streak",
      },
      sections: {
        recent: "Recent Submissions",
        activity: "Activity",
      },
      states: {
        loading: "Loading...",
        empty: "No data yet",
        unknownProblem: "Unknown Problem",
      },
      activity: {
        solvedPrefix: "solved",
        solvedMiddle: "",
      },
    },

    feed: {
      selected: "Selected",
      posts: "posts",
      subtitle: "Discover what others are building with MiniScript+",
      whatsOnYourMind: "What's on your mind?",
      createPost: "Create Post",
      removeCode: "Remove code",
      addCode: "Add code",
      pasteCode: "Paste your code here...",
      dragDrop: "Drag & drop an image here",
      orClick: "or click to browse",
      posting: "Posting...",
      post: "Post",
      suggestedUsers: "Suggested users",
      noSuggestions: "No suggestions yet.",
      follow: "Follow",
      unfollow: "Unfollow",
      noPosts: "No posts yet. Be the first to share something!",
      share: "Share",
      linkCopied: "Link copied!",
      imageUploadFailed: "Image upload failed",
      failedToPost: "Failed to post",
      posted: "Posted!",
      followed: "Followed!",
      unfollowed: "Unfollowed",

      title: "Feed",
      postsCount: "{count} posts",
      description: "Discover what others are building with MiniScript+",

      create: {
        trigger: "Create Post",
        title: "Create Post",
        placeholder: "What's on your mind?",
        addCode: "Add code",
        removeCode: "Remove code",
        codePlaceholder: "Paste your code here...",
        dragDrop: "Drag & drop an image here",
        browse: "or click to browse",
        selected: "Selected",
        post: "Post",
        posting: "Posting...",
      },

      suggested: {
        title: "Suggested users",
        empty: "No suggestions yet.",
        follow: "Follow",
        unfollow: "Unfollow",
      },

      empty: "No posts yet. Be the first to share something!",

      actions: {
        share: "Share",
      },

      toast: {
        copied: "Link copied!",
        postError: "Failed to post",
        posted: "Posted!",
        uploadError: "Image upload failed",
        followed: "Followed!",
        unfollowed: "Unfollowed",
      },
    },

    post: {
      loading: "Loading...",
      share: "Share",
      linkCopied: "Link copied!",
      userFallback: "User",
      notFound: "Post not found",
      viewPost: "View post",
      writeComment: "Write a comment...",
      send: "Send",
    },

    search: {
      placeholder: "Search users...",
      topUsers: "Top Users",
      recent: "Recent searches",
      noResults: "No users found",
      points: "pts",
    },

    profile: {
      followers: "followers",
      following: "following",
      shareCopied: "Profile link copied!",

      stats: {
        title: "Stats",
        solved: "Solved",
        attempted: "Attempted",
        average: "Average",
      },

      successRate: "Success Rate",

      streak: {
        title: "Streak",
        days: "days active",
      },

      difficulty: {
        title: "Difficulty Distribution",
        easy: "Easy",
        medium: "Medium",
        hard: "Hard",
      },

      favorites: {
        title: "Favorite Problems",
        empty: "No favorites yet.",
      },

      achievements: {
        title: "Achievements",
      },

      recent: {
        title: "Recent Submissions",
      },
    },

    publicProfile: {
      notFound: "User not found",

      stats: {
        solved: "Solved",
        average: "Average",
        streak: "Streak",
      },

      achievements: "Achievements",

      posts: {
        title: "Recent Posts",
        empty: "No posts yet.",
      },

      submissions: {
        title: "Recent Submissions",
      },

      meta: {
        title: "{username} on ScripticX",
        description: "Check out {username}'s profile on ScripticX",
      },
    },

    social: {
      followers: {
        title: "Followers",
        count: "{count} followers",
      },
      following: {
        title: "Following",
        count: "{count} following",
      },
    },

    live: {
      shareCopied: "Link copied!",

      sessionTitle: "Live Session",
      untitledSession: "Untitled Session",
      share: "Share",
      invite: "Invite",
      endSession: "End Session",

      online: "online",
      you: "(You)",

      sessionEnded: "This session has ended. You can view the code but cannot edit.",

      run: "Run",
      step: "Step",
      clear: "Clear",
      editor: "Editor",

      debugger: "Debugger",
      noOutput: "No output",
      inputPrompt: "Input",
      inputPlaceholder: "Enter value...",
      ok: "OK",

      users: "Users",
      owner: "Owner",

      chat: "Chat",
      messagePlaceholder: "Type a message...",
      send: "Send",

      inviteTitle: "Invite Users",
      searchPlaceholder: "Search users...",
      inSession: "In session",
      inviteButton: "Invite",

      toast: {
        userInSession: "User already in session",
        userInvited: "User already invited",
        inviteFailed: "Failed to send invite",
        inviteSent: "Invite sent",
        error: "Unexpected error",
      },
    },

    livecode: {
      title: "Live Coding",
      subtitle: "Collaborate in real-time coding sessions",
      createSession: "Create Session",

      stats: {
        total: "Total Sessions",
        active: "Active",
        past: "Past",
      },

      sessions: {
        activeTitle: "Active Sessions",
        pastTitle: "Past Sessions",
        noActive: "No active sessions",
        noPast: "No past sessions",
        fallbackName: "Session",
      },

      roles: {
        owner: "Owner",
        member: "Member",
      },

      status: {
        active: "Active",
        closed: "Closed",
      },

      invites: {
        title: "Pending Invites",
        empty: "No pending invites",
        accept: "Accept",
        decline: "Decline",
      },

      dialog: {
        title: "Create Session",
        placeholder: "Session name",
        creating: "Creating...",
        create: "Create",
        untitled: "Untitled Session",
      },
    },

    examples: {
      title: "Examples",
      subtitle: "Explore practical coding examples and learn by doing",

      pages: {
        basics: "Basics",
        loops: "Loops",
        conditions: "Conditions",
        algorithms: "Algorithms",
      },

      sections: {
        basics: {
          title: "Basics",
          description: "Simple programs and syntax examples",
        },
        loops: {
          title: "Loops",
          description: "Practice with loops and iterations",
        },
        conditions: {
          title: "Conditions",
          description: "If statements and logic",
        },
        algorithms: {
          title: "Algorithms",
          description: "Classic problems and solutions",
        },
      },

      basics: {
        title: "Basics",
        subtitle: "Simple examples to understand how the language works",
        run: "Run",
        print: {
          title: "Printing text",
          description: "Use PRINT to display messages.",
        },
        variables: {
          title: "Variables",
          description: "Store values in variables and print them.",
        },
        math: {
          title: "Math operations",
          description: "You can perform calculations using operators.",
        },
        conditions: {
          title: "Conditions",
          description: "Use IF statements to control program flow.",
        },
      },
      loops: {
        title: "Loops",
        subtitle: "Learn how to repeat actions using loops",
        run: "Run",
        while: {
          title: "While loop",
          description: "A WHILE loop runs as long as the condition is true.",
        },
        sum: {
          title: "Sum from 1 to N",
          description: "Calculate the sum of numbers from 1 to N.",
        },
        countdown: {
          title: "Countdown",
          description: "Loop backwards from a number to zero.",
        },
        inputLoop: {
          title: "Loop with input",
          description: "Ask the user for input multiple times.",
        },
      },
      conditions: {
        title: "Conditions",
        subtitle: "Control your program using IF statements",
        run: "Run",
        simpleIf: {
          title: "Simple IF",
          description: "Execute code only if a condition is true.",
        },
        ifElse: {
          title: "IF / ELSE",
          description: "Choose between two paths.",
        },
        evenOdd: {
          title: "Even or Odd",
          description: "Check if a number is even or odd.",
        },
        maxTwo: {
          title: "Max of two numbers",
          description: "Find the larger number between two values.",
        },
      },
      algorithms: {
        title: "Algorithms",
        subtitle: "Solve classic problems using logic and loops",
        run: "Run",
        prime: {
          title: "Prime number check",
          description: "Check if a number is prime.",
        },
        fibonacci: {
          title: "Fibonacci sequence",
          description: "Generate the first N Fibonacci numbers.",
        },
        gcd: {
          title: "Greatest Common Divisor (GCD)",
          description: "Find the GCD of two numbers using subtraction.",
        },
        findMax: {
          title: "Find maximum (manual)",
          description: "Simulate finding the maximum from values.",
        },
      },
    },

    classes: {
      title: "Classes",
      subtitle: "Manage and join your coding classes",
      createClass: "Create Class",
      loading: "Loading...",
      noClasses: "No classes yet",

      roles: {
        teacher: "Teacher",
        student: "Student",
      },

      join: {
        title: "Join with code",
        placeholder: "Enter invite code",
        button: "Join",
      },

      dialog: {
        createTitle: "Create Class",
        classNamePlaceholder: "Class name",
        create: "Create",
      },

      detail: {
        teacherLabel: "Teacher:",
        inviteCodeLabel: "Invite code:",
        newAssignment: "New Assignment",

        assignments: {
          titleTeacher: "Assignments (Given to students)",
          titleStudent: "Assignments (To complete)",
          emptyTeacher: "No assignments created yet",
          emptyStudent: "No assignments assigned to you",
          noDeadline: "No deadline",
          open: "Open",
        },

        members: "Members",

        invite: {
          title: "Invite",
          shareText: "Share this code to invite students:",
        },

        createAssignment: {
          title: "Create Assignment",
          problemSelected: "problem selected",
          problemsSelected: "problems selected",
          selectProblem: "Select a problem",
          searchProblem: "Search problem...",
          noProblemsFound: "No problems found",
          titlePlaceholder: "Title",
          descriptionPlaceholder: "Description",
          pickDeadline: "Pick a deadline",
          create: "Create",
        },
      },

      assignment: {
        loading: "Loading...",
        notFound: "Assignment not found",
        deadlineLabel: "Deadline:",
        noDeadline: "No deadline",
        description: "Description",

        status: {
          submittedLate: "Submitted (Late)",
          submitted: "Submitted",
          late: "Late",
          inProgress: "In progress",
          notSubmitted: "Not submitted",
          solvedLate: "Solved (Late)",
          solved: "Solved",
        },

        problems: {
          title: "Problems",
          empty: "No problems attached",
          problemPrefix: "Problem",
          solve: "Solve",
        },

        submissions: {
          title: "Submissions",
          view: "View",
          noCode: "No code",
          dialogTitle: "Submission",
        },
      },

      solve: {
        loading: "Loading...",
        subtitle: "Solve the problem and submit your solution",
        problemFallback: "Problem",
        noDescription: "No problem description",
        yourSolution: "Your Solution",
        submitted: "Submitted!",
        submit: "Submit",
      },
    },

    admin: {
      title: "Admin Panel",
      problems: {
        title: "Problems",
        description: "Create, edit and manage problems",
        action: "Go to Problems",
        manageTitle: "Manage Problems",
        create: "Create Problem",
        edit: "Edit",
        delete: "Delete",
        dialog: {
          deleteTitle: "Delete problem?",
          deleteDescription: "This action cannot be undone.",
          cancel: "Cancel",
          confirmDelete: "Delete",
          createTitle: "Create Problem",
        },
        toast: {
          deleteError: "Failed to delete problem",
          deleted: "Problem deleted",
        },
        editPage: {
          title: "Edit Problem",
          notFound: "Problem not found",
        },
        form: {
          addLanguage: "Add language",
          deleteLanguage: "Delete",
          title: "Title",
          description: "Description",
          starterCode: "Starter code",
          difficulty: "Difficulty",
          selectDifficulty: "Select difficulty",
          testCases: "Test Cases",
          addTestCase: "Add Test Case",
          inputPlaceholder: "Input (ex: [3] or [1,2])",
          expectedOutput: "Expected Output",

          submit: {
            saving: "Saving...",
            create: "Create Problem",
            update: "Update Problem",
          },

          validation: {
            required: "Title and description are required in at least one language",
          },

          toast: {
            saveError: "Failed to save problem",
            created: "Problem created",
            updated: "Problem updated",
          }
        }
      },
      users: {
        title: "Users",
        description: "Manage users, roles and bans",
        action: "Manage Users",

        page: {
          manageTitle: "Manage Users",
          searchPlaceholder: "Search users...",
          loading: "Loading...",
          usersCount: "users",

          dialog: {
            deleteTitle: "Delete this user?",
            cancel: "Cancel",
            confirm: "Delete",
          },

          badges: {
            banned: "banned",
          },
        },
      },
    },

    login: {
      title: "Welcome",
      tabs: {
        login: "Login",
        register: "Register",
      },
      email: "Email",
      password: "Password",
      username: "Username",
      loginButton: "Login",
      registerButton: "Create Account",
      modal: {
        loginErrorTitle: "Unable to sign in",
        registerErrorTitle: "Unable to sign up",
        usernameRequired: "Username is required",
        accountCreatedTitle: "Account created",
        accountCreatedDescription: "You can now log in.",
      }
    },

    settings: {
      title: "Settings",

      profile: "Profile",
      upload: "Upload",
      remove: "Remove",
      noFile: "No file selected",

      account: "Account",
      username: "Username",
      bio: "Bio",

      social: "Social Links",
      github: "GitHub Profile",
      twitter: "Twitter (X) Profile",
      website: "Website",

      saveProfile: "Save Profile Changes",

      security: "Security",
      updatePassword: "Update Password",

      avatar: {
        edit: "Edit Avatar",
        save: "Save",
        updated: "Avatar updated",
        removed: "Avatar removed",
      },

      toast: {
        profileUpdated: "Profile updated",
        passwordUpdated: "Password updated",
      }
    },

    banned: {
      title: "Account Suspended",
      description: "Your account has been banned from using the platform.",
      logout: "Logout",
    },

    common: {
      viewAll: "View all",
    },

    notFound: {
      title: "Page Not Found",
      description: "The page you're looking for doesn't exist or was moved.",
      goHome: "Go Home",
    },
  },

  ro: {
    sidebar: {
      platform: "Platformă",
      learn: "Învățare",
    },

    nav: {
      editor: "Editor",
      livecode: "Programare live",
      problems: "Probleme",
      leaderboard: "Clasament",
      feed: "Feed",
      dashboard: "Panou",
      search: "Căutare",
      admin: "Admin",
      docs: "Documentație",
      examples: "Exemple",
      classes: "Clase",
      whatsNew: "Noutăți",
      help: "Ajutor",
      contact: "Contact",
    },

    mobileDrawer: {
      title: "Navigare mobilă",
      subtitle: "Navigarea platformei",
      open: "Deschide navigarea mobilă",
    },

    learn: {
      docs: "Documentație",
      pages: {
        introduction: "Introducere",
        basics: "Elemente de Bază",
        variables: "Variabile",
        loops: "Bucle",
        io: "Intrare / Ieșire",
      },

      basics: "Elemente de Bază",
      variables: "Variabile",
      loops: "Bucle",
      inputOutput: "Intrare / Ieșire",

      title: "Documentație MiniScript+",
      subtitle: "Învață cum să folosești MiniScript+ pas cu pas, cu exemple și explicații.",

      sections: {
        what: {
          title: "Ce este MiniScript+?",
          text: "MiniScript+ este un limbaj interpretat simplu, creat pentru a te ajuta să înveți logica programării. Se concentrează pe claritate și execuție pas cu pas.",
        },
        example: {
          title: "Exemplu",
        },
        how: {
          title: "Cum funcționează",
          bullets: [
            "Codul este executat linie cu linie",
            "Variabilele stochează valori",
            "Buclele repetă logica",
            "Intrare/Ieșire îți permite să interacționezi cu programele",
          ],
        },
      },
      basicsPage: {
        title: "Elemente de Bază",
        subtitle: "Învață elementele fundamentale ale MiniScript+.",
        sections: {
          statements: {
            title: "Instrucțiuni",
            text: "Un program este format din instrucțiuni executate de sus în jos."
          },
          variables: {
            title: "Variabile",
            text: "Variabilele stochează valori pe care le poți folosi ulterior."
          },
          math: {
            title: "Operații matematice",
            text: "Poți efectua calcule folosind operatori."
          },
          conditions: {
            title: "Condiții",
            text: "Folosește instrucțiuni IF pentru a controla fluxul programului."
          }
        }
      },
      variablesPage: {
        title: "Variabile",
        subtitle: "Variabilele stochează valori care pot fi folosite și modificate în program.",
        sections: {
          what: {
            title: "Ce este o variabilă?",
            text: "O variabilă este un container cu nume care reține o valoare."
          },
          using: {
            title: "Folosirea variabilelor",
            text: "După ce creezi o variabilă, o poți folosi în expresii."
          },
          updating: {
            title: "Actualizarea variabilelor",
            text: "Poți modifica valoarea unei variabile oricând."
          },
          types: {
            title: "Tipuri de variabile",
            text: "MiniScript+ suportă mai multe tipuri de valori:",
            bullets: [
              "Numere → 10, 3.14",
              "Șiruri → \"Hello\"",
              "Booleene → true, false"
            ]
          },
          naming: {
            title: "Denumirea variabilelor",
            text: "Numele variabilelor ar trebui să fie clare și sugestive.",
            note: "Evită spațiile sau caracterele speciale."
          }
        }
      },
      loopsPage: {
        title: "Bucle",
        subtitle: "Buclele îți permit să repeți un bloc de cod de mai multe ori.",
        sections: {
          while: {
            title: "Bucla WHILE",
            text: "O buclă WHILE rulează cât timp o condiție este adevărată."
          },
          how: {
            title: "Cum funcționează",
            bullets: [
              "Condiția este verificată înainte de fiecare iterație",
              "Dacă este adevărată → bucla rulează",
              "Dacă este falsă → bucla se oprește"
            ]
          },
          example: {
            title: "Exemplu explicat",
            output: "Rezultatul va fi:"
          },
          infinite: {
            title: "Bucle infinite",
            text: "Dacă condiția nu devine niciodată falsă, bucla va rula la infinit.",
            note: "Ai grijă — aceasta nu se va opri fără întrerupere manuală."
          },
          mistake: {
            title: "Greșeală comună",
            text: "Uitarea actualizării variabilei în interiorul buclei.",
            warning: "Aceasta va cauza o buclă infinită"
          }
        }
      },
      inputOutputPage: {
        title: "Intrare / Ieșire",
        subtitle: "Programele interacționează cu utilizatorii prin intrare și ieșire.",
        sections: {
          output: {
            title: "Ieșire (PRINT)",
            text: "Folosește PRINT pentru a afișa valori sau text."
          },
          variables: {
            title: "Folosirea variabilelor în output"
          },
          input: {
            title: "Intrare (INPUT)",
            text: "INPUT permite programului să primească o valoare de la utilizator."
          },
          example: {
            title: "Exemplu",
            text: "Programul cere două valori și afișează suma lor."
          },
          how: {
            title: "Cum funcționează INPUT",
            bullets: [
              "Programul se oprește și așteaptă input",
              "Valoarea este stocată într-o variabilă",
              "Execuția continuă după ce inputul este oferit"
            ]
          },
          types: {
            title: "Tipuri de input",
            text: "Valoarea introdusă poate fi:",
            bullets: [
              "Număr → 10",
              "Text → Hello",
              "Boolean → true / false"
            ]
          },
          mistake: {
            title: "Greșeală comună",
            note: "Asigură-te că inputul este un număr dacă vrei să faci calcule."
          }
        }
      },
    },

    user: {
      profile: "Profil",
      settings: "Setări",
      logout: "Deconectare",
      login: "Autentificare",
      user: "Utilizator",
      language: "Limbă",
    },

    editor: {
      title: "Editor MiniScript+",
      placeholderTitle: "Titlu",
      placeholderDescription: "Descriere",

      actions: {
        newSnippet: "Snippet nou",
        compile: "Compilează codul",
        step: "Execuție pas cu pas",
        run: "Rulează programul",
        download: "Descarcă .msp",
        save: "Salvează snippet",
        update: "Actualizează snippet",
        share: "Distribuie snippet",
      },

      complexity: {
        title: "Analizor de complexitate",
        empty: "Rulează analizorul pentru a estima complexitatea de timp, complexitatea de spațiu și scorul de optimizare.",
        warnings: "Avertismente",
        suggestions: "Sugestii",
        actions: {
          analyze: "Analizează complexitatea",
          rerun: "Rulează din nou analiza complexității",
        },
        metrics: {
          time: "Timp",
          space: "Spațiu",
          loops: "Bucle",
          maxNesting: "Imbricare maximă",
        },
        levels: {
          excellent: "excelent",
          good: "bun",
          average: "mediu",
          poor: "slab",
        },
        toast: {
          completed: "Analiza complexității este gata",
        },
      },

      debugger: {
        title: "Debugger",
        variables: "Variabile",
        currentLine: "Linia curentă",
        output: "Output",
        input: "Introdu valoare pentru",
        submit: "Trimite",
      },

      snippets: {
        title: "Snippet-urile mele",
        empty: "Nu ai snippet-uri încă",
        untitled: "Fără titlu",
        edit: "Editează snippet",
        delete: "Șterge snippet",
      },

      toast: {
        savedFile: "Fișier salvat!",
        saveError: "Eroare la salvare fișier",
        snippetSaved: "Snippet salvat",
        snippetSaveError: "Eroare la salvare snippet",
        copied: "Link copiat!",
        deleteError: "Eroare la ștergere",
        deleted: "Snippet șters",
      }
    },

    snippetPage: {
      notFound: "Snippet-ul nu a fost găsit",
      untitled: "Fără titlu",
      unknownUser: "Necunoscut",
      shared: "A distribuit un snippet",
      public: "Public",

      actions: {
        copy: "Copiază",
        share: "Distribuie",
        openEditor: "Deschide editorul",
      },

      code: {
        title: "Cod",
      },

      toast: {
        codeCopied: "Cod copiat!",
        copyError: "Eroare la copiere cod",
        linkCopied: "Link copiat!",
        linkError: "Eroare la copiere link",
      }
    },

    problems: {
      title: "Probleme",
      searchPlaceholder: "Caută probleme...",

      filters: {
        all: "Toate",
        easy: "Ușor",
        medium: "Mediu",
        hard: "Greu",
      },

      status: {
        solved: "Rezolvat",
        notStarted: "Neînceput",
      }
    },

    problemPage: {
      notFound: "Problema nu a fost găsită",

      actions: {
        submit: "Trimite",
      },

      result: {
        score: "Scor",
        error: "EROARE",
      },

      tests: {
        test: "Test",
        input: "Intrare",
        expected: "Așteptat",
        got: "Obținut",
      }
    },

    leaderboard: {
      title: "Clasament",
      description: "Cei mai buni utilizatori după scor total",
      points: "pct",
    },

    dashboard: {
      title: "Panou",
      overview: "Prezentare",
      stats: {
        solved: "Probleme rezolvate",
        score: "Scor total",
        streak: "Streak",
      },
      sections: {
        recent: "Submisii recente",
        activity: "Activitate",
      },
      states: {
        loading: "Se încarcă...",
        empty: "Nu există date",
        unknownProblem: "Problemă necunoscută",
      },
      activity: {
        solvedPrefix: "",
        solvedMiddle: "a rezolvat problema",
      },
    },

    feed: {
      posts: "postări",
      selected: "Selectat",
      subtitle: "Descoperă ce construiesc alții cu MiniScript+",
      whatsOnYourMind: "La ce te gândești?",
      createPost: "Creează postare",
      removeCode: "Elimină cod",
      addCode: "Adaugă cod",
      pasteCode: "Lipește codul aici...",
      dragDrop: "Trage o imagine aici",
      orClick: "sau apasă pentru a selecta",
      posting: "Se postează...",
      post: "Postează",
      suggestedUsers: "Utilizatori sugerați",
      noSuggestions: "Nu există sugestii încă.",
      follow: "Urmărește",
      unfollow: "Nu mai urmări",
      noPosts: "Nu există postări încă. Fii primul care postează!",
      share: "Distribuie",
      linkCopied: "Link copiat!",
      imageUploadFailed: "Eroare la upload imagine",
      failedToPost: "Eroare la postare",
      posted: "Postat!",
      followed: "Urmărit!",
      unfollowed: "Nu mai urmărești",

      title: "Feed",
      postsCount: "{count} postări",
      description: "Descoperă ce construiesc alții cu MiniScript+",

      create: {
        trigger: "Creează postare",
        title: "Creează postare",
        placeholder: "La ce te gândești?",
        addCode: "Adaugă cod",
        removeCode: "Elimină cod",
        codePlaceholder: "Lipește codul aici...",
        dragDrop: "Trage o imagine aici",
        browse: "sau apasă pentru a selecta",
        selected: "Selectat",
        post: "Postează",
        posting: "Se postează...",
      },

      suggested: {
        title: "Utilizatori sugerați",
        empty: "Nu există sugestii încă.",
        follow: "Follow",
        unfollow: "Unfollow",
      },

      empty: "Nu există postări încă. Fii primul care postează!",

      actions: {
        share: "Distribuie",
      },

      toast: {
        copied: "Link copiat!",
        postError: "Eroare la postare",
        posted: "Postat!",
        uploadError: "Eroare la upload imagine",
        followed: "Urmărit!",
        unfollowed: "Nu mai urmărești",
      },
    },

    post: {
      loading: "Se încarcă...",
      share: "Distribuie",
      linkCopied: "Link copiat!",
      userFallback: "Utilizator",
      notFound: "Postarea nu a fost găsită",
      viewPost: "Vezi postarea",
      writeComment: "Scrie un comentariu...",
      send: "Trimite",
    },

    search: {
      placeholder: "Caută utilizatori...",
      topUsers: "Top utilizatori",
      recent: "Căutări recente",
      noResults: "Nu au fost găsiți utilizatori",
      points: "pct",
    },

    profile: {
      followers: "followers",
      following: "following",
      shareCopied: "Link profil copiat!",

      stats: {
        title: "Statistici",
        solved: "Rezolvate",
        attempted: "Încercate",
        average: "Medie",
      },

      successRate: "Rată de succes",

      streak: {
        title: "Streak",
        days: "zile active",
      },

      difficulty: {
        title: "Distribuție dificultate",
        easy: "Ușor",
        medium: "Mediu",
        hard: "Greu",
      },

      favorites: {
        title: "Probleme favorite",
        empty: "Nu ai favorite încă.",
      },

      achievements: {
        title: "Realizări",
      },

      recent: {
        title: "Submisii recente",
      },
    },

    publicProfile: {
      notFound: "Utilizator negăsit",

      stats: {
        solved: "Rezolvate",
        average: "Medie",
        streak: "Streak",
      },

      achievements: "Realizări",

      posts: {
        title: "Postări recente",
        empty: "Nu există postări încă.",
      },

      submissions: {
        title: "Submisii recente",
      },

      meta: {
        title: "{username} pe ScripticX",
        description: "Vezi profilul lui {username} pe ScripticX",
      },
    },

    social: {
      followers: {
        title: "Urmăritori",
        count: "{count} urmăritori",
      },
      following: {
        title: "Urmăriți",
        count: "{count} urmăriți",
      },
    },

    live: {
      shareCopied: "Link copiat!",

      sessionTitle: "Sesiune live",
      untitledSession: "Sesiune fără titlu",
      share: "Distribuie",
      invite: "Invită",
      endSession: "Încheie sesiunea",

      online: "online",
      you: "(Tu)",

      sessionEnded: "Această sesiune s-a încheiat. Poți vedea codul, dar nu îl poți edita.",

      run: "Rulează",
      step: "Pas",
      clear: "Șterge",
      editor: "Editor",

      debugger: "Debugger",
      noOutput: "Niciun output",
      inputPrompt: "Input",
      inputPlaceholder: "Introdu valoarea...",
      ok: "OK",

      users: "Utilizatori",
      owner: "Proprietar",

      chat: "Chat",
      messagePlaceholder: "Scrie un mesaj...",
      send: "Trimite",

      inviteTitle: "Invită utilizatori",
      searchPlaceholder: "Caută utilizatori...",
      inSession: "În sesiune",
      inviteButton: "Invită",

      toast: {
        userInSession: "Utilizatorul este deja în sesiune",
        userInvited: "Utilizatorul a fost deja invitat",
        inviteFailed: "Eroare la trimiterea invitației",
        inviteSent: "Invitație trimisă",
        error: "Eroare neașteptată",
      },
    },

    livecode: {
      title: "Programare live",
      subtitle: "Colaborează în sesiuni de programare în timp real",
      createSession: "Creează sesiune",

      stats: {
        total: "Total sesiuni",
        active: "Active",
        past: "Anterioare",
      },

      sessions: {
        activeTitle: "Sesiuni active",
        pastTitle: "Sesiuni anterioare",
        noActive: "Nicio sesiune activă",
        noPast: "Nicio sesiune anterioară",
        fallbackName: "Sesiune",
      },

      roles: {
        owner: "Proprietar",
        member: "Membru",
      },

      status: {
        active: "Activ",
        closed: "Închis",
      },

      invites: {
        title: "Invitații în așteptare",
        empty: "Nicio invitație în așteptare",
        accept: "Acceptă",
        decline: "Refuză",
      },

      dialog: {
        title: "Creează sesiune",
        placeholder: "Numele sesiunii",
        creating: "Se creează...",
        create: "Creează",
        untitled: "Sesiune fără titlu",
      },
    },

    examples: {
      title: "Exemple",
      subtitle: "Explorează exemple practice de cod și învață făcând",

      pages: {
        basics: "Elemente de bază",
        loops: "Bucle",
        conditions: "Condiții",
        algorithms: "Algoritmi",
      },

      sections: {
        basics: {
          title: "Elemente de bază",
          description: "Programe simple și exemple de sintaxă",
        },
        loops: {
          title: "Bucle",
          description: "Practică cu bucle și iterații",
        },
        conditions: {
          title: "Condiții",
          description: "Instrucțiuni IF și logică",
        },
        algorithms: {
          title: "Algoritmi",
          description: "Probleme clasice și soluții",
        },
      },

      basics: {
        title: "Elemente de bază",
        subtitle: "Exemple simple pentru a înțelege cum funcționează limbajul",
        run: "Rulează",
        print: {
          title: "Afișarea textului",
          description: "Folosește PRINT pentru a afișa mesaje.",
        },
        variables: {
          title: "Variabile",
          description: "Stochează valori în variabile și afișează-le.",
        },
        math: {
          title: "Operații matematice",
          description: "Poți efectua calcule folosind operatori.",
        },
        conditions: {
          title: "Condiții",
          description: "Folosește instrucțiuni IF pentru a controla fluxul programului.",
        },
      },
      loops: {
        title: "Bucle",
        subtitle: "Învață cum să repeți acțiuni folosind bucle",
        run: "Rulează",
        while: {
          title: "Bucla While",
          description: "O buclă WHILE rulează cât timp condiția este adevărată.",
        },
        sum: {
          title: "Suma de la 1 la N",
          description: "Calculează suma numerelor de la 1 la N.",
        },
        countdown: {
          title: "Numărătoare inversă",
          description: "Buclă de la un număr înapoi la zero.",
        },
        inputLoop: {
          title: "Buclă cu input",
          description: "Cere utilizatorului input de mai multe ori.",
        },
      },
      conditions: {
        title: "Condiții",
        subtitle: "Controlează programul folosind instrucțiuni IF",
        run: "Rulează",
        simpleIf: {
          title: "IF simplu",
          description: "Execută cod doar dacă o condiție este adevărată.",
        },
        ifElse: {
          title: "IF / ELSE",
          description: "Alege între două căi.",
        },
        evenOdd: {
          title: "Par sau impar",
          description: "Verifică dacă un număr este par sau impar.",
        },
        maxTwo: {
          title: "Maximul a două numere",
          description: "Găsește numărul mai mare dintre două valori.",
        },
      },
      algorithms: {
        title: "Algoritmi",
        subtitle: "Rezolvă probleme clasice folosind logică și bucle",
        run: "Rulează",
        prime: {
          title: "Verificare număr prim",
          description: "Verifică dacă un număr este prim.",
        },
        fibonacci: {
          title: "Șirul Fibonacci",
          description: "Generează primele N numere Fibonacci.",
        },
        gcd: {
          title: "Cel mai mare divizor comun (CMMDC)",
          description: "Găsește CMMDC a două numere prin scădere.",
        },
        findMax: {
          title: "Găsirea maximului (manual)",
          description: "Simulează găsirea valorii maxime dintr-un set de valori.",
        },
      },
    },

    classes: {
      title: "Clase",
      subtitle: "Gestionează și alătură-te claselor de programare",
      createClass: "Creează clasă",
      loading: "Se încarcă...",
      noClasses: "Nicio clasă încă",

      roles: {
        teacher: "Profesor",
        student: "Elev",
      },

      join: {
        title: "Alătură-te cu cod",
        placeholder: "Introdu codul de invitație",
        button: "Alătură-te",
      },

      dialog: {
        createTitle: "Creează clasă",
        classNamePlaceholder: "Numele clasei",
        create: "Creează",
      },

      detail: {
        teacherLabel: "Profesor:",
        inviteCodeLabel: "Cod de invitație:",
        newAssignment: "Temă nouă",

        assignments: {
          titleTeacher: "Teme (Atribuite elevilor)",
          titleStudent: "Teme (De rezolvat)",
          emptyTeacher: "Nicio temă creată încă",
          emptyStudent: "Nicio temă atribuită",
          noDeadline: "Fără termen limită",
          open: "Deschide",
        },

        members: "Membri",

        invite: {
          title: "Invitație",
          shareText: "Distribuie acest cod pentru a invita elevi:",
        },

        createAssignment: {
          title: "Creează temă",
          problemSelected: "problemă selectată",
          problemsSelected: "probleme selectate",
          selectProblem: "Selectează o problemă",
          searchProblem: "Caută problemă...",
          noProblemsFound: "Nicio problemă găsită",
          titlePlaceholder: "Titlu",
          descriptionPlaceholder: "Descriere",
          pickDeadline: "Alege termenul limită",
          create: "Creează",
        },
      },

      assignment: {
        loading: "Se încarcă...",
        notFound: "Tema nu a fost găsită",
        deadlineLabel: "Termen limită:",
        noDeadline: "Fără termen limită",
        description: "Descriere",

        status: {
          submittedLate: "Trimis (întârziat)",
          submitted: "Trimis",
          late: "Întârziat",
          inProgress: "În progres",
          notSubmitted: "Netrimis",
          solvedLate: "Rezolvat (întârziat)",
          solved: "Rezolvat",
        },

        problems: {
          title: "Probleme",
          empty: "Nicio problemă atașată",
          problemPrefix: "Problema",
          solve: "Rezolvă",
        },

        submissions: {
          title: "Submisii",
          view: "Vezi",
          noCode: "Niciun cod",
          dialogTitle: "Submisie",
        },
      },

      solve: {
        loading: "Se încarcă...",
        subtitle: "Rezolvă problema și trimite soluția ta",
        problemFallback: "Problemă",
        noDescription: "Nicio descriere a problemei",
        yourSolution: "Soluția ta",
        submitted: "Trimis!",
        submit: "Trimite",
      },
    },

    admin: {
      title: "Panou Admin",
      problems: {
        title: "Probleme",
        description: "Creează, editează și gestionează probleme",
        action: "Mergi la Probleme",
        manageTitle: "Gestionare probleme",
        create: "Creează problemă",
        edit: "Editează",
        delete: "Șterge",
        dialog: {
          deleteTitle: "Ștergi problema?",
          deleteDescription: "Această acțiune nu poate fi anulată.",
          cancel: "Anulează",
          confirmDelete: "Șterge",
          createTitle: "Creează problemă",
        },
        toast: {
          deleteError: "Eroare la ștergere problemă",
          deleted: "Problemă ștearsă",
        },
        editPage: {
          title: "Editează problemă",
          notFound: "Problema nu a fost găsită",
        },
        form: {
          addLanguage: "Adaugă limbă",
          deleteLanguage: "Șterge",
          title: "Titlu",
          description: "Descriere",
          starterCode: "Cod inițial",
          difficulty: "Dificultate",
          selectDifficulty: "Selectează dificultatea",
          testCases: "Cazuri de test",
          addTestCase: "Adaugă caz de test",
          inputPlaceholder: "Input (ex: [3] sau [1,2])",
          expectedOutput: "Output așteptat",

          submit: {
            saving: "Se salvează...",
            create: "Creează problemă",
            update: "Actualizează problema",
          },

          validation: {
            required: "Titlul și descrierea sunt necesare în cel puțin o limbă",
          },

          toast: {
            saveError: "Eroare la salvare problemă",
            created: "Problemă creată",
            updated: "Problemă actualizată",
          }
        }
      },
      users: {
        title: "Utilizatori",
        description: "Gestionează utilizatori, roluri și interdicții",
        action: "Gestionează utilizatori",

        page: {
          manageTitle: "Gestionare utilizatori",
          searchPlaceholder: "Caută utilizatori...",
          loading: "Se încarcă...",
          usersCount: "utilizatori",

          dialog: {
            deleteTitle: "Ștergi acest utilizator?",
            cancel: "Anulează",
            confirm: "Șterge",
          },

          badges: {
            banned: "banned",
          },
        },
      },
    },

    login: {
      title: "Bine ai venit",
      tabs: {
        login: "Autentificare",
        register: "Înregistrare",
      },
      email: "Email",
      password: "Parolă",
      username: "Nume utilizator",
      loginButton: "Autentificare",
      registerButton: "Creează cont",
      modal: {
        loginErrorTitle: "Nu te-ai putut autentifica",
        registerErrorTitle: "Nu te-ai putut înregistra",
        usernameRequired: "Numele de utilizator este necesar",
        accountCreatedTitle: "Cont creat",
        accountCreatedDescription: "Te poți autentifica acum.",
      }
    },

    settings: {
      title: "Setări",

      profile: "Profil",
      upload: "Încarcă",
      remove: "Șterge",
      noFile: "Niciun fișier selectat",

      account: "Cont",
      username: "Nume utilizator",
      bio: "Bio",

      social: "Link-uri sociale",
      github: "Profil GitHub",
      twitter: "Profil Twitter (X)",
      website: "Website",

      saveProfile: "Salvează modificările profilului",

      security: "Securitate",
      updatePassword: "Actualizează parola",

      avatar: {
        edit: "Editează avatar",
        save: "Salvează",
        updated: "Avatar actualizat",
        removed: "Avatar șters",
      },

      toast: {
        profileUpdated: "Profil actualizat",
        passwordUpdated: "Parolă actualizată",
      }
    },

    banned: {
      title: "Cont suspendat",
      description: "Contul tău a fost blocat și nu mai poate folosi platforma.",
      logout: "Deconectare",
    },

    common: {
      viewAll: "Vezi tot",
    },

    notFound: {
      title: "Pagina nu a fost găsită",
      description: "Pagina pe care o cauți nu există sau a fost mutată.",
      goHome: "Acasă",
    },
  },
};

export type Locale = "en" | "ro";
