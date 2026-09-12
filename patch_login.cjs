const fs = require('fs');
let code = fs.readFileSync('src/components/LoginPage.tsx', 'utf8');

const oldLogic = `      const email = selectedRole === 'student' 
        ? (regParentEmail.trim() || \`\${regStudentName.replace(/\\s+/g, '').toLowerCase()}@ogrenci.com\`)
        : regParentEmail.trim();
      const pass = regPassword;
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const user = userCredential.user;
      
      const newProfile: UserProfile = {
        id: user.uid,
        email: email,
        name: selectedRole === 'student' ? regStudentName.trim() : (email.split('@')[0]),
        role: selectedRole,
        grade: regGrade,
        avatar: selectedRole === 'student' ? '🦊' : '👨‍👩‍👧',
        level: 1,
        xp: 100,
        streak: 1,
        lastActiveDate: new Date().toISOString(),
        dailyGoalMinutes: 15,
        todayMinutesSpent: 0,
        soundEnabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        totalPoints: 100,
        claimedStreakDays: [1],
        totalQuestionsSolved: 0,
        resolvedMistakesCount: 0,
      };
      
      await setDoc(doc(db, 'users', user.uid), newProfile);
      dataService.loginAs(selectedRole, newProfile);
      
      // Send verification email if it is a real address
      let verificationSent = false;
      if (email.includes('@') && !email.includes('@ogrenci.com') && !email.includes('@zekapark.com')) {
        try {
          await sendEmailVerification(user);
          verificationSent = true;
        } catch (verifyErr) {
          console.warn('Email verification error:', verifyErr);
        }
      }`;

const newLogic = `      let newProfile: UserProfile;
      let verificationSent = false;

      if (selectedRole === 'parent') {
        const parentEmail = regParentEmail.trim();
        const parentPass = regPassword;
        
        // 1. Generate Student Code and Email
        const baseName = regStudentName.trim().replace(/\\s+/g, '').toLowerCase();
        // Generate random 4 digit code
        const studentCode = \`\${baseName.toUpperCase()}\${Math.floor(1000 + Math.random() * 9000)}\`;
        const studentEmail = \`\${studentCode.toLowerCase()}@zekapark.com\`;
        
        // 2. Create Student Account First
        const studentCred = await createUserWithEmailAndPassword(auth, studentEmail, parentPass);
        const studentUid = studentCred.user.uid;
        
        const studentProfile: UserProfile = {
          id: studentUid,
          email: studentEmail,
          name: regStudentName.trim(),
          role: 'student',
          studentCode: studentCode,
          grade: regGrade,
          avatar: '🦊',
          level: 1,
          xp: 100,
          streak: 1,
          lastActiveDate: new Date().toISOString(),
          dailyGoalMinutes: 15,
          todayMinutesSpent: 0,
          soundEnabled: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          totalPoints: 100,
          claimedStreakDays: [1],
          totalQuestionsSolved: 0,
          resolvedMistakesCount: 0,
        };
        await setDoc(doc(db, 'users', studentUid), studentProfile);

        // 3. Create Parent Account Second (leaves parent signed in)
        const parentCred = await createUserWithEmailAndPassword(auth, parentEmail, parentPass);
        const parentUid = parentCred.user.uid;

        newProfile = {
          id: parentUid,
          email: parentEmail,
          name: parentEmail.split('@')[0],
          role: 'parent',
          avatar: '👨‍👩‍👧',
          level: 1,
          xp: 0,
          streak: 1,
          lastActiveDate: new Date().toISOString(),
          dailyGoalMinutes: 0,
          todayMinutesSpent: 0,
          soundEnabled: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          linkedStudentIds: [studentUid]
        };
        await setDoc(doc(db, 'users', parentUid), newProfile);

        // Update student with parent ID
        await setDoc(doc(db, 'users', studentUid), { linkedParentId: parentUid }, { merge: true });

        dataService.loginAs('parent', newProfile);
        
        if (parentEmail.includes('@') && !parentEmail.includes('@zekapark.com')) {
          try {
            await sendEmailVerification(parentCred.user);
            verificationSent = true;
          } catch (verifyErr) {
            console.warn('Email verification error:', verifyErr);
          }
        }
      } else {
        const email = regParentEmail.trim() || \`\${regStudentName.replace(/\\s+/g, '').toLowerCase()}@ogrenci.com\`;
        const pass = regPassword;
        
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const user = userCredential.user;
        
        newProfile = {
          id: user.uid,
          email: email,
          name: regStudentName.trim(),
          role: 'student',
          grade: regGrade,
          avatar: '🦊',
          level: 1,
          xp: 100,
          streak: 1,
          lastActiveDate: new Date().toISOString(),
          dailyGoalMinutes: 15,
          todayMinutesSpent: 0,
          soundEnabled: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          totalPoints: 100,
          claimedStreakDays: [1],
          totalQuestionsSolved: 0,
          resolvedMistakesCount: 0,
        };
        
        await setDoc(doc(db, 'users', user.uid), newProfile);
        dataService.loginAs('student', newProfile);
        
        if (email.includes('@') && !email.includes('@ogrenci.com') && !email.includes('@zekapark.com')) {
          try {
            await sendEmailVerification(user);
            verificationSent = true;
          } catch (verifyErr) {
            console.warn('Email verification error:', verifyErr);
          }
        }
      }`;

code = code.replace(oldLogic, newLogic);
fs.writeFileSync('src/components/LoginPage.tsx', code);
