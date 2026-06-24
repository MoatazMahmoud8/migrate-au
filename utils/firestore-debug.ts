/**
 * Firestore debugging utilities for notification system
 * Use this to diagnose Firebase/Firestore initialization issues on React Native
 */

import { Platform } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import app from '@react-native-firebase/app';
import messaging from '@react-native-firebase/messaging';
import auth from '@react-native-firebase/auth';

export async function diagnoseFirebase() {
  console.log('\n=== FIREBASE DIAGNOSTIC REPORT ===\n');
  
  // 1. Check platform
  console.log('Platform:', Platform.OS);
  if (Platform.OS === 'web') {
    console.log('⚠️  Running on web - native Firebase not available');
    return;
  }

  try {
    // 2. Check Firebase app initialization
    console.log('\n--- Firebase App ---');
    try {
      const firebaseApp = app();
      console.log('✅ Firebase app initialized:', firebaseApp.name);
      console.log('   Project ID:', firebaseApp.options?.projectId);
      console.log('   Storage bucket:', firebaseApp.options?.storageBucket);
    } catch (err) {
      console.error('❌ Firebase app NOT initialized:', err instanceof Error ? err.message : err);
      return;
    }

    // 3. Check Firestore module
    console.log('\n--- Firestore Module ---');
    try {
      const fs = firestore();
      console.log('✅ Firestore instance obtained');
      console.log('   Type:', typeof fs);
      console.log('   Constructor:', fs.constructor.name);
      console.log('   Has collection():', typeof fs.collection === 'function');
    } catch (err) {
      console.error('❌ Firestore initialization failed:', err instanceof Error ? err.message : err);
      return;
    }

    // 4. Check Messaging
    console.log('\n--- Cloud Messaging ---');
    try {
      const msg = messaging();
      console.log('✅ Messaging instance obtained');
      const token = await msg.getToken();
      console.log('   FCM Token:', token ? `${token.slice(0, 20)}...` : 'NO TOKEN');
    } catch (err) {
      console.error('❌ Messaging failed:', err instanceof Error ? err.message : err);
    }

    // 5. Check Auth
    console.log('\n--- Authentication ---');
    try {
      const currentUser = auth().currentUser;
      console.log('✅ Auth status:', currentUser ? `logged in as ${currentUser.uid}` : 'anonymous');
    } catch (err) {
      console.error('❌ Auth check failed:', err instanceof Error ? err.message : err);
    }

    // 6. Test Firestore collection access
    console.log('\n--- Firestore Collection Access ---');
    try {
      const fs = firestore();
      const col = fs.collection('notifications');
      console.log('✅ Collection reference created');
      
      // Try a simple get query
      console.log('   Running test query (limit 1)...');
      const snap = await col.limit(1).get();
      console.log(`✅ Query succeeded: ${snap.size} documents`);
      
      // Try counting all docs
      console.log('   Running count query...');
      const countSnap = await col.count().get();
      console.log(`✅ Collection has ${countSnap.data().count} total documents`);
    } catch (err) {
      console.error('❌ Collection access failed:', err instanceof Error ? err.message : err);
      if (err instanceof Error) {
        console.error('   Stack:', err.stack);
      }
    }

    // 7. Test listener setup
    console.log('\n--- Firestore Listener Setup ---');
    try {
      const fs = firestore();
      const col = fs.collection('notifications');
      let receivedSnapshot = false;
      let listenerError: any = null;

      console.log('   Attaching test listener...');
      const unsubscribe = col.limit(1).onSnapshot(
        snap => {
          receivedSnapshot = true;
          console.log(`✅ Listener received snapshot: ${snap.docs.length} docs`);
          unsubscribe(); // cleanup
        },
        err => {
          listenerError = err;
          console.error('❌ Listener error:', err instanceof Error ? err.message : err);
          unsubscribe(); // cleanup
        }
      );

      // Wait a bit for callback
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (receivedSnapshot) {
        console.log('✅ Listener successfully received snapshot');
      } else if (listenerError) {
        console.error('❌ Listener failed with error');
      } else {
        console.warn('⚠️  Listener attached but no snapshot received yet (this might be OK)');
      }
    } catch (err) {
      console.error('❌ Listener setup failed:', err instanceof Error ? err.message : err);
    }

    console.log('\n=== END DIAGNOSTIC REPORT ===\n');
  } catch (err) {
    console.error('Diagnostic failed:', err);
  }
}
