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

    command: {
      title: "Command menu",
      description: "Search pages, live sessions and profiles.",
      placeholder: "Type a command or search...",
      open: "Open command menu",
      empty: "No results found.",
      untitledSession: "Untitled session",
      groups: {
        navigation: "Navigation",
        liveSessions: "Live sessions",
        participants: "Session participants",
      },
    },

    notifications: {
      title: "Notifications",
      open: "Open notifications",
      unread: "{count} unread",
      allCaughtUp: "All caught up",
      markAllRead: "Mark all as read",
      enableBrowser: "Enable browser notifications",
      browserEnabledTitle: "ScripticX notifications enabled",
      browserEnabledBody: "You will receive browser alerts for new notifications while the app is open.",
      browserBlocked: "The browser accepted permission, but the system blocked the notification.",
      empty: "No notifications yet",
      emptyHint: "Invites, follows and important updates will appear here.",
    },

    network: {
      offlineTitle: "No network available",
      reconnecting: "Trying to reconnect in {seconds}s...",
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
      subtitle: "Learn MiniScript+ through small examples, visual execution, debugging and the tools built into ScripticX.",

      sections: {
        what: {
          title: "What is MiniScript+?",
          text: "MiniScript+ is a small interpreted language made for learning programming logic. It keeps the syntax readable, then shows what happens inside the program through variables, output, AST views and step-by-step execution.",
        },
        example: {
          title: "Example",
        },
        how: {
          title: "How it works",
          bullets: [
            "The engine parses each line into structured instructions",
            "Expressions are evaluated through an AST, so operator priority stays correct",
            "The debugger shows the current line, variables and output while the program runs",
            "The analyzer estimates time and space complexity from the program structure",
          ],
        },
        platform: {
          title: "What ScripticX adds around the language",
          text: "The language is only one part of the learning flow. ScripticX also gives students a modern workspace where they can test code, save multi-file snippet projects, solve problems and collaborate live.",
          bullets: [
            "Automatic tests with per-case feedback",
            "Daily code challenges with bonus points",
            "AST and flowchart visualization for understanding program structure",
            "Live coding sessions with chat, presence and shared code",
            "RO/EN interface and localized educational content",
          ],
        },
      },
      basicsPage: {
        title: "Basics",
        subtitle: "Start with the instructions you will use most often in MiniScript+.",
        sections: {
          statements: {
            title: "Statements",
            text: "A program is made of clear statements. The engine reads them in order, unless an IF or WHILE changes the flow."
          },
          variables: {
            title: "Variables",
            text: "Variables store values that can be reused, printed or updated while the program runs."
          },
          math: {
            title: "Math Operations",
            text: "MiniScript+ supports arithmetic expressions, comparisons and helper functions such as INT, TRUNC and ROUND."
          },
          conditions: {
            title: "Conditions",
            text: "Use IF statements when the program needs to choose between different paths."
          }
        }
      },
      variablesPage: {
        title: "Variables",
        subtitle: "Variables are the program's memory: they keep the values you want to reuse or change.",
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
            text: "You can update a variable by assigning it a new expression. The debugger is useful here because it shows the value changing after each step."
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
        subtitle: "Loops repeat a block of code and are the first place where algorithmic thinking becomes visible.",
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
            text: "If the condition never becomes false, the loop would run forever. ScripticX stops suspicious executions and reports a runtime error instead of freezing the page.",
            note: "Use the step debugger to check whether the variable inside the loop actually changes."
          },
          mistake: {
            title: "Common Mistake",
            text: "Forgetting to update the variable inside the loop.",
            warning: "This can cause an infinite loop"
          }
        }
      },
      inputOutputPage: {
        title: "Input / Output",
        subtitle: "INPUT and PRINT make programs interactive and easy to test with multiple cases.",
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
              "Execution continues after input is provided",
              "In problem solving, each test case supplies its own input automatically"
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

      githubImport: {
        action: "Import from GitHub",
        title: "Import .msp files from GitHub",
        description: "Paste a public GitHub repository link and ScripticX will add only the MiniScript+ files to the current project.",
        label: "GitHub repository link",
        placeholder: "https://github.com/user/repository",
        hint: "Public repositories are supported in this quick version. Up to 30 .msp files are imported.",
        import: "Import files",
        importing: "Importing...",
        cancel: "Cancel",
        toast: {
          invalidUrl: "Paste a valid GitHub repository link.",
          noFiles: "No .msp files were found in this repository.",
          failed: "Could not import files from GitHub.",
          imported: "Imported {count} .msp file(s) from GitHub.",
        },
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

      visualization: {
        title: "Code Visualization",
        tabs: {
          ast: "AST",
          flowchart: "Flowchart",
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
        results: "Results",
        correct: "Correct answer",
        wrong: "Wrong answer",
        programRead: "The program read",
        programPrinted: "The program printed",
        shouldHavePrinted: "The program should have printed",
      },

      tabs: {
        description: "Problem",
        solution: "My solution",
      },

      solution: {
        points: "points",
        successMessage: "Congratulations! Your code passed all tests.",
        encouragement: "Your code got partial credit. Review the examples, try to fix your solution, and submit again.",
      },

      evaluation: {
        title: "Evaluating solution...",
        subtitle: "Running your code against every test case.",
        testCase: "Test case",
        pending: "pending",
        evaluating: "evaluating",
        passed: "passed",
        failed: "failed",
      }
    },

    leaderboard: {
      title: "Leaderboard",
      description: "Top users ranked by total score",
      points: "pts",
      community: "ScripticX Community",
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
      deletePost: "Delete post",
      deleted: "Post deleted.",
      deleteFailed: "The post could not be deleted.",
      deleteDialog: {
        title: "Delete this post?",
        description:
          "This action is permanent and will remove the post from the feed.",
        cancel: "Cancel",
        confirm: "Delete",
        deleting: "Deleting...",
      },

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
      notFoundDescription: "This post may have been removed or is no longer public.",
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
        empty: "No followers yet.",
      },
      following: {
        title: "Following",
        count: "{count} following",
        empty: "Not following anyone yet.",
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

      console: "Console",
      debugger: "Debugger",
      tabSize: "Tab size",
      spaces: "spaces",
      noOutput: "No output",
      inputPrompt: "Input",
      inputPlaceholder: "Enter value...",
      ok: "OK",

      users: "Users",
      owner: "Owner",
      removeParticipant: "Remove participant",

      chat: "Chat",
      messagePlaceholder: "Type a message...",
      send: "Send",

      inviteTitle: "Invite Users",
      searchPlaceholder: "Search users...",
      noInviteUsers: "No users found",
      inSession: "In session",
      inviteButton: "Invite",

      toast: {
        userInSession: "User already in session",
        userInvited: "User already invited",
        inviteFailed: "Failed to send invite",
        inviteSent: "Invite sent",
        noAccess: "You no longer have access to this live session.",
        removeFailed: "Failed to remove participant",
        userRemoved: "Participant removed",
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
      subtitle: "Explore practical MiniScript+ programs, then open them in the editor to run, debug and analyze them.",

      pages: {
        basics: "Basics",
        loops: "Loops",
        conditions: "Conditions",
        algorithms: "Algorithms",
      },

      sections: {
        basics: {
          title: "Basics",
          description: "Small examples for PRINT, variables, math and simple IF statements",
        },
        loops: {
          title: "Loops",
          description: "Practice repeated logic, counters, sums and input loops",
        },
        conditions: {
          title: "Conditions",
          description: "Use IF / ELSE to make decisions inside a program",
        },
        algorithms: {
          title: "Algorithms",
          description: "Classic patterns such as prime checks, Fibonacci, GCD and maximum search",
        },
      },

      basics: {
        title: "Basics",
        subtitle: "Simple examples to understand how the language works before moving to larger problems",
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
          description: "Use IF statements to control the path of execution.",
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
          description: "Calculate a running total and watch it change in the debugger.",
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
          description: "Check if a number is prime using a divisor loop. Try the complexity analyzer after running it.",
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

      updates: {
        title: "Updates",
        description: "Write and publish changelog posts in Markdown.",
        action: "Manage updates",
        page: {
          title: "Updates",
          subtitle: "Write and publish changelog posts. Markdown is supported.",
        },
        actions: {
          new: "New update",
        },
        empty: {
          title: "No updates yet",
          subtitle: "Publish your first changelog entry to see it here.",
        },
        dialog: {
          createTitle: "New update",
          editTitle: "Edit update",
        },
        deleteDialog: {
          title: "Delete this update?",
          description: "This will permanently remove \"{title}\". This action cannot be undone.",
          cancel: "Cancel",
          confirm: "Delete",
        },
        form: {
          addLanguage: "Add language",
          removeLanguage: "Remove {language}",
          languages: {
            en: "English",
            ro: "Romanian",
          },
          title: "Title",
          titlePlaceholder: "What's new in this release?",
          slug: "Slug",
          date: "Date",
          pickDate: "Pick a date",
          tag: "Tag",
          tags: {
            none: "No tag",
            new: "New",
            fix: "Fix",
            improved: "Improved",
          },
          content: "Content",
          edit: "Edit",
          preview: "Preview",
          contentPlaceholder: "# Heading\n\nWrite your update in **Markdown**…",
          nothingToPreview: "Nothing to preview yet.",
          saving: "Saving…",
          saveChanges: "Save changes",
          publish: "Publish update",
          validation: {
            required: "Fill in the title, slug, date, and content.",
          },
        },
        toast: {
          deleted: "Update deleted",
          saved: "Update saved",
          published: "Update published",
        },
      },

      contact: {
        cardTitle: "Contact",
        cardDescription: "Read and manage messages from the contact form.",
        cardAction: "View messages",
        title: "Contact messages",
        subtitle: "Messages submitted from the contact form.",
        newBadge: "{count} new",
        searchPlaceholder: "Search name, email, content…",
        statusFilter: {
          all: "All statuses",
          new: "New",
          read: "Read",
          resolved: "Resolved",
        },
        empty: {
          title: "No messages",
          subtitle: "Nothing matches your current filters.",
        },
        topics: {
          bug: "Bug",
          feature: "Feature",
          account: "Account",
          feedback: "Feedback",
          other: "Other",
        },
        statuses: {
          new: "new",
          read: "read",
          resolved: "resolved",
        },
        actions: {
          view: "View",
          markResolved: "Mark as resolved",
          delete: "Delete",
          reply: "Reply by email",
          reopen: "Reopen",
        },
        dialog: {
          messageFrom: "Message from {name}",
          registeredBadge: "registered",
          messageLabel: "Message",
        },
        deleteDialog: {
          title: "Delete this message?",
          description: "This will permanently remove the message from \"{name}\". This action cannot be undone.",
          cancel: "Cancel",
          confirm: "Delete",
        },
        toast: {
          deleted: "Message deleted",
        },
        replySubject: "Re: your message on ScripticX",
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
      googleButton: "Continue with Google",
      or: "or continue with email",
      forgotPassword: "Forgot your password?",
      modal: {
        loginErrorTitle: "Unable to sign in",
        registerErrorTitle: "Unable to sign up",
        googleErrorTitle: "Google sign-in could not start",
        usernameRequired: "Username is required",
        profileError: "Your account was created, but the profile could not be saved.",
        accountCreatedTitle: "Account created",
        accountCreatedDescription: "Check your inbox to confirm your email, then you can sign in.",
      }
    },

    authCallback: {
      title: "Signing you in",
      description: "We are securely connecting your Google account to ScripticX.",
      errorTitle: "Sign-in could not be completed",
      profileError: "Your Google account was connected, but the ScripticX profile could not be created.",
      timeout: "The sign-in response took too long. Please try again.",
      backToLogin: "Back to login",
    },

    forgotPassword: {
      title: "Reset your password",
      description: "Enter your email and we will send you a secure password reset link.",
      sendButton: "Send reset link",
      sentTitle: "Check your inbox",
      sentDescription: "If an account exists for this email, you will receive a password reset link shortly.",
      backToLogin: "Back to login",
    },

    resetPassword: {
      title: "Choose a new password",
      description: "Use at least 8 characters and choose a password you do not use elsewhere.",
      newPassword: "New password",
      confirmPassword: "Confirm new password",
      updateButton: "Update password",
      passwordTooShort: "The password must contain at least 8 characters.",
      passwordMismatch: "The passwords do not match.",
      invalidLink: "This reset link is invalid or has expired.",
      requestNewLink: "Request a new link",
      successTitle: "Password updated",
      successDescription: "Your new password is active. You can continue using ScripticX.",
      continueButton: "Continue to dashboard",
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

    updates: {
      empty: {
        title: "No updates yet",
        subtitle: "Check back soon for the latest changes.",
      },
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

    command: {
      title: "Meniu de comenzi",
      description: "Caută pagini, sesiuni live și profiluri.",
      placeholder: "Scrie o comandă sau caută...",
      open: "Deschide meniul de comenzi",
      empty: "Nu s-au găsit rezultate.",
      untitledSession: "Sesiune fără titlu",
      groups: {
        navigation: "Navigare",
        liveSessions: "Sesiuni live",
        participants: "Participanți în sesiuni",
      },
    },

    notifications: {
      title: "Notificări",
      open: "Deschide notificările",
      unread: "{count} necitite",
      allCaughtUp: "Ești la zi",
      markAllRead: "Marchează toate ca citite",
      enableBrowser: "Activează notificările browserului",
      browserEnabledTitle: "Notificările ScripticX sunt active",
      browserEnabledBody: "Vei primi alerte în browser pentru notificări noi cât timp aplicația este deschisă.",
      browserBlocked: "Browserul a acceptat permisiunea, dar sistemul a blocat notificarea.",
      empty: "Nu ai notificări încă",
      emptyHint: "Invitațiile, urmăririle și update-urile importante vor apărea aici.",
    },

    network: {
      offlineTitle: "Nu există conexiune la internet",
      reconnecting: "Încerc reconectarea în {seconds}s...",
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
      subtitle: "Învață MiniScript+ prin exemple mici, execuție vizuală, debugging și instrumentele integrate în ScripticX.",

      sections: {
        what: {
          title: "Ce este MiniScript+?",
          text: "MiniScript+ este un limbaj interpretat mic, construit pentru învățarea logicii de programare. Păstrează sintaxa ușor de citit, apoi arată ce se întâmplă în interiorul programului prin variabile, output, AST și execuție pas cu pas.",
        },
        example: {
          title: "Exemplu",
        },
        how: {
          title: "Cum funcționează",
          bullets: [
            "Engine-ul parsează fiecare linie în instrucțiuni structurate",
            "Expresiile sunt evaluate prin AST, astfel încât prioritatea operatorilor rămâne corectă",
            "Debugger-ul arată linia curentă, variabilele și output-ul în timpul execuției",
            "Analizatorul estimează complexitatea în timp și spațiu din structura programului",
          ],
        },
        platform: {
          title: "Ce adaugă ScripticX în jurul limbajului",
          text: "Limbajul este doar o parte din procesul de învățare. ScripticX oferă elevilor un workspace modern în care pot testa cod, salva proiecte cu mai multe fișiere, rezolva probleme și colabora live.",
          bullets: [
            "Teste automate cu feedback pentru fiecare caz",
            "Daily code challenges cu puncte bonus",
            "Vizualizare AST și flowchart pentru înțelegerea structurii programului",
            "Sesiuni live coding cu chat, prezență și cod partajat",
            "Interfață RO/EN și conținut educațional localizat",
          ],
        },
      },
      basicsPage: {
        title: "Elemente de Bază",
        subtitle: "Începe cu instrucțiunile pe care le vei folosi cel mai des în MiniScript+.",
        sections: {
          statements: {
            title: "Instrucțiuni",
            text: "Un program este format din instrucțiuni clare. Engine-ul le citește în ordine, cu excepția cazurilor în care IF sau WHILE schimbă fluxul."
          },
          variables: {
            title: "Variabile",
            text: "Variabilele stochează valori care pot fi refolosite, afișate sau actualizate în timpul execuției."
          },
          math: {
            title: "Operații matematice",
            text: "MiniScript+ suportă expresii aritmetice, comparații și funcții utile precum INT, TRUNC și ROUND."
          },
          conditions: {
            title: "Condiții",
            text: "Folosește instrucțiuni IF atunci când programul trebuie să aleagă între mai multe căi."
          }
        }
      },
      variablesPage: {
        title: "Variabile",
        subtitle: "Variabilele sunt memoria programului: păstrează valorile pe care vrei să le refolosești sau să le modifici.",
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
            text: "Poți actualiza o variabilă atribuindu-i o expresie nouă. Debugger-ul este util aici, pentru că arată cum se schimbă valoarea după fiecare pas."
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
        subtitle: "Buclele repetă un bloc de cod și fac vizibilă logica algoritmică.",
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
            text: "Dacă o condiție nu devine niciodată falsă, bucla ar rula la infinit. ScripticX oprește execuțiile suspecte și afișează o eroare de runtime, fără să blocheze pagina.",
            note: "Folosește debugger-ul pas cu pas ca să verifici dacă variabila din buclă chiar se modifică."
          },
          mistake: {
            title: "Greșeală comună",
            text: "Uitarea actualizării variabilei în interiorul buclei.",
            warning: "Aceasta poate cauza o buclă infinită"
          }
        }
      },
      inputOutputPage: {
        title: "Intrare / Ieșire",
        subtitle: "INPUT și PRINT fac programele interactive și ușor de testat cu mai multe cazuri.",
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
              "Execuția continuă după ce inputul este oferit",
              "În probleme, fiecare test case furnizează automat propriile date de intrare"
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

      githubImport: {
        action: "Importă din GitHub",
        title: "Importă fișiere .msp din GitHub",
        description: "Introdu linkul unui repository public GitHub, iar ScripticX va adăuga doar fișierele MiniScript+ în proiectul curent.",
        label: "Link repository GitHub",
        placeholder: "https://github.com/user/repository",
        hint: "În varianta rapidă sunt acceptate repository-uri publice. Se importă maximum 30 de fișiere .msp.",
        import: "Importă fișiere",
        importing: "Se importă...",
        cancel: "Anulează",
        toast: {
          invalidUrl: "Introdu un link valid de repository GitHub.",
          noFiles: "Nu am găsit fișiere .msp în acest repository.",
          failed: "Nu am putut importa fișierele din GitHub.",
          imported: "Am importat {count} fișier(e) .msp din GitHub.",
        },
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

      visualization: {
        title: "Vizualizare cod",
        tabs: {
          ast: "AST",
          flowchart: "Flowchart",
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
        results: "Rezultate",
        correct: "Răspuns corect",
        wrong: "Răspuns greșit",
        programRead: "Programul a citit",
        programPrinted: "Programul a afișat",
        shouldHavePrinted: "Programul ar fi trebuit să afișeze",
      },

      tabs: {
        description: "Cerință",
        solution: "Soluția mea",
      },

      solution: {
        points: "puncte",
        successMessage: "Felicitări! Codul tău a trecut toate testele.",
        encouragement: "Codul tău a obținut un punctaj parțial. Analizează exemplele, încearcă să îți corectezi soluția și trimite o nouă soluție.",
      },

      evaluation: {
        title: "Se evaluează soluția...",
        subtitle: "Rulăm soluția pe fiecare test case.",
        testCase: "Test case",
        pending: "în așteptare",
        evaluating: "se evaluează",
        passed: "passed",
        failed: "failed",
      }
    },

    leaderboard: {
      title: "Clasament",
      description: "Cei mai buni utilizatori după scor total",
      points: "pct",
      community: "Comunitatea ScripticX",
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
      deletePost: "Șterge postarea",
      deleted: "Postarea a fost ștearsă.",
      deleteFailed: "Postarea nu a putut fi ștearsă.",
      deleteDialog: {
        title: "Ștergi această postare?",
        description:
          "Acțiunea este permanentă și va elimina postarea din feed.",
        cancel: "Anulează",
        confirm: "Șterge",
        deleting: "Se șterge...",
      },

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
      notFoundDescription: "Postarea a fost ștearsă sau nu mai este publică.",
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
        empty: "Nu există urmăritori încă.",
      },
      following: {
        title: "Urmăriți",
        count: "{count} urmăriți",
        empty: "Nu urmărește pe nimeni încă.",
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

      console: "Consolă",
      debugger: "Debugger",
      tabSize: "Tab",
      spaces: "spații",
      noOutput: "Niciun output",
      inputPrompt: "Input",
      inputPlaceholder: "Introdu valoarea...",
      ok: "OK",

      users: "Utilizatori",
      owner: "Proprietar",
      removeParticipant: "Elimină participant",

      chat: "Chat",
      messagePlaceholder: "Scrie un mesaj...",
      send: "Trimite",

      inviteTitle: "Invită utilizatori",
      searchPlaceholder: "Caută utilizatori...",
      noInviteUsers: "Nu am găsit utilizatori",
      inSession: "În sesiune",
      inviteButton: "Invită",

      toast: {
        userInSession: "Utilizatorul este deja în sesiune",
        userInvited: "Utilizatorul a fost deja invitat",
        inviteFailed: "Eroare la trimiterea invitației",
        inviteSent: "Invitație trimisă",
        noAccess: "Nu mai ai acces la această sesiune live.",
        removeFailed: "Eroare la eliminarea participantului",
        userRemoved: "Participant eliminat",
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
      subtitle: "Explorează programe MiniScript+ practice, apoi deschide-le în editor ca să le rulezi, depanezi și analizezi.",

      pages: {
        basics: "Elemente de bază",
        loops: "Bucle",
        conditions: "Condiții",
        algorithms: "Algoritmi",
      },

      sections: {
        basics: {
          title: "Elemente de bază",
          description: "Exemple mici pentru PRINT, variabile, matematică și IF simplu",
        },
        loops: {
          title: "Bucle",
          description: "Exersează logica repetitivă, contoare, sume și input în buclă",
        },
        conditions: {
          title: "Condiții",
          description: "Folosește IF / ELSE ca să iei decizii în program",
        },
        algorithms: {
          title: "Algoritmi",
          description: "Modele clasice: numere prime, Fibonacci, CMMDC și căutarea maximului",
        },
      },

      basics: {
        title: "Elemente de bază",
        subtitle: "Exemple simple pentru a înțelege limbajul înainte de probleme mai mari",
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
          description: "Folosește IF pentru a controla direcția execuției.",
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
          description: "Calculează o sumă progresivă și urmărește cum se schimbă în debugger.",
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
          description: "Verifică dacă un număr este prim folosind o buclă cu divizori. Încearcă apoi analizatorul de complexitate.",
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

      updates: {
        title: "Noutăți",
        description: "Scrie și publică articole de changelog folosind Markdown.",
        action: "Gestionează noutățile",
        page: {
          title: "Noutăți",
          subtitle: "Scrie și publică articole despre schimbările platformei. Poți folosi Markdown.",
        },
        actions: {
          new: "Noutate nouă",
        },
        empty: {
          title: "Nu există noutăți încă",
          subtitle: "Publică prima intrare din changelog pentru a o vedea aici.",
        },
        dialog: {
          createTitle: "Noutate nouă",
          editTitle: "Editează noutatea",
        },
        deleteDialog: {
          title: "Ștergi această noutate?",
          description: "Noutatea „{title}” va fi ștearsă definitiv. Acțiunea nu poate fi anulată.",
          cancel: "Anulează",
          confirm: "Șterge",
        },
        form: {
          addLanguage: "Adaugă limbă",
          removeLanguage: "Elimină {language}",
          languages: {
            en: "Engleză",
            ro: "Română",
          },
          title: "Titlu",
          titlePlaceholder: "Ce este nou în această versiune?",
          slug: "Adresă URL",
          date: "Data publicării",
          pickDate: "Alege o dată",
          tag: "Etichetă",
          tags: {
            none: "Fără etichetă",
            new: "Nou",
            fix: "Remediere",
            improved: "Îmbunătățire",
          },
          content: "Conținut",
          edit: "Editează",
          preview: "Previzualizare",
          contentPlaceholder: "# Titlu\n\nScrie noutatea folosind **Markdown**…",
          nothingToPreview: "Nu există încă nimic de previzualizat.",
          saving: "Se salvează…",
          saveChanges: "Salvează modificările",
          publish: "Publică noutatea",
          validation: {
            required: "Completează titlul, adresa URL, data și conținutul.",
          },
        },
        toast: {
          deleted: "Noutate ștearsă",
          saved: "Noutate salvată",
          published: "Noutate publicată",
        },
      },

      contact: {
        cardTitle: "Contact",
        cardDescription: "Citește și gestionează mesajele trimise prin formularul de contact.",
        cardAction: "Vezi mesajele",
        title: "Mesaje de contact",
        subtitle: "Mesaje trimise din formularul de contact.",
        newBadge: "{count} noi",
        searchPlaceholder: "Caută nume, email, conținut…",
        statusFilter: {
          all: "Toate stările",
          new: "Noi",
          read: "Citite",
          resolved: "Rezolvate",
        },
        empty: {
          title: "Niciun mesaj",
          subtitle: "Nimic nu corespunde filtrelor curente.",
        },
        topics: {
          bug: "Bug",
          feature: "Funcționalitate",
          account: "Cont",
          feedback: "Feedback",
          other: "Altele",
        },
        statuses: {
          new: "nou",
          read: "citit",
          resolved: "rezolvat",
        },
        actions: {
          view: "Vezi",
          markResolved: "Marchează ca rezolvat",
          delete: "Șterge",
          reply: "Răspunde prin email",
          reopen: "Redeschide",
        },
        dialog: {
          messageFrom: "Mesaj de la {name}",
          registeredBadge: "înregistrat",
          messageLabel: "Mesaj",
        },
        deleteDialog: {
          title: "Ștergi acest mesaj?",
          description: "Acest mesaj de la \"{name}\" va fi șters definitiv. Acțiunea nu poate fi anulată.",
          cancel: "Anulează",
          confirm: "Șterge",
        },
        toast: {
          deleted: "Mesaj șters",
        },
        replySubject: "Re: mesajul tău pe ScripticX",
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
      googleButton: "Continuă cu Google",
      or: "sau continuă cu email",
      forgotPassword: "Ai uitat parola?",
      modal: {
        loginErrorTitle: "Nu te-ai putut autentifica",
        registerErrorTitle: "Nu te-ai putut înregistra",
        googleErrorTitle: "Autentificarea Google nu a putut porni",
        usernameRequired: "Numele de utilizator este necesar",
        profileError: "Contul a fost creat, dar profilul nu a putut fi salvat.",
        accountCreatedTitle: "Cont creat",
        accountCreatedDescription: "Verifică emailul pentru confirmarea contului, apoi te poți autentifica.",
      }
    },

    authCallback: {
      title: "Te autentificăm",
      description: "Conectăm în siguranță contul Google la ScripticX.",
      errorTitle: "Autentificarea nu a putut fi finalizată",
      profileError: "Contul Google a fost conectat, dar profilul ScripticX nu a putut fi creat.",
      timeout: "Răspunsul de autentificare a durat prea mult. Încearcă din nou.",
      backToLogin: "Înapoi la autentificare",
    },

    forgotPassword: {
      title: "Resetează parola",
      description: "Introdu adresa de email și îți vom trimite un link securizat pentru resetarea parolei.",
      sendButton: "Trimite linkul",
      sentTitle: "Verifică emailul",
      sentDescription: "Dacă există un cont pentru această adresă, vei primi în curând linkul de resetare.",
      backToLogin: "Înapoi la autentificare",
    },

    resetPassword: {
      title: "Alege o parolă nouă",
      description: "Folosește cel puțin 8 caractere și alege o parolă pe care nu o utilizezi în altă parte.",
      newPassword: "Parolă nouă",
      confirmPassword: "Confirmă parola nouă",
      updateButton: "Actualizează parola",
      passwordTooShort: "Parola trebuie să conțină cel puțin 8 caractere.",
      passwordMismatch: "Parolele nu coincid.",
      invalidLink: "Linkul de resetare este invalid sau a expirat.",
      requestNewLink: "Solicită un link nou",
      successTitle: "Parolă actualizată",
      successDescription: "Noua parolă este activă. Poți continua să folosești ScripticX.",
      continueButton: "Continuă la panou",
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

    updates: {
      empty: {
        title: "Nicio actualizare încă",
        subtitle: "Revino în curând pentru cele mai noi modificări.",
      },
    },

    notFound: {
      title: "Pagina nu a fost găsită",
      description: "Pagina pe care o cauți nu există sau a fost mutată.",
      goHome: "Acasă",
    },
  },
};

export type Locale = "en" | "ro";
