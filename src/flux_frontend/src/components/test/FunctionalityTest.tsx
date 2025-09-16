import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { VideoService } from '../../lib/videoService';
import { UserService } from '../../lib/userService';
import { CommentService } from '../../lib/commentService';
import { useWallet } from '../../hooks/useWallet';
import { toast } from 'react-hot-toast';

export const FunctionalityTest: React.FC = () => {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const { newAuthActor } = useWallet();

  const addResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const runTests = async () => {
    if (!newAuthActor) {
      addResult('❌ No auth actor available');
      return;
    }

    setIsRunning(true);
    setTestResults([]);
    addResult('🚀 Starting functionality tests...');

    try {
      // Test 1: Video Service
      addResult('📹 Testing Video Service...');
      const videoService = new VideoService(newAuthActor);
      
      // Test like video (using a mock video ID)
      const likeResult = await videoService.likeVideo('test-video-id');
      addResult(`❤️ Like video: ${likeResult ? '✅ Success' : '❌ Failed'}`);

      // Test get comments count
      const commentsCount = await videoService.getVideoCommentsCount('test-video-id');
      addResult(`💬 Comments count: ${commentsCount} (${commentsCount >= 0 ? '✅ Success' : '❌ Failed'})`);

      // Test 2: User Service
      addResult('👤 Testing User Service...');
      const userService = new UserService(newAuthActor);
      
      // Test follow user (using a mock user ID)
      const followResult = await userService.followUser('test-user-id');
      addResult(`👥 Follow user: ${followResult ? '✅ Success' : '❌ Failed'}`);

      // Test unfollow user
      const unfollowResult = await userService.unfollowUser('test-user-id');
      addResult(`👥 Unfollow user: ${unfollowResult ? '✅ Success' : '❌ Failed'}`);

      // Test get user relationship
      const relationship = await userService.getUserRelationship('test-user-id');
      addResult(`🔗 User relationship: ${relationship} (${relationship !== 'None' ? '✅ Success' : '❌ Failed'})`);

      // Test 3: Comment Service
      addResult('💭 Testing Comment Service...');
      const commentService = new CommentService(newAuthActor);
      
      // Test add comment
      const addCommentResult = await commentService.addComment('test-video-id', 'Test comment');
      addResult(`➕ Add comment: ${addCommentResult ? '✅ Success' : '❌ Failed'}`);

      // Test like comment
      const likeCommentResult = await commentService.likeComment('test-comment-id');
      addResult(`❤️ Like comment: ${likeCommentResult ? '✅ Success' : '❌ Failed'}`);

      // Test toggle comment like
      const toggleLikeResult = await commentService.toggleCommentLike('test-comment-id');
      addResult(`🔄 Toggle comment like: ${toggleLikeResult ? '✅ Success' : '❌ Failed'}`);

      addResult('🎉 All tests completed!');
      toast.success('Functionality tests completed!');

    } catch (error) {
      addResult(`❌ Test error: ${error}`);
      toast.error('Test failed');
    } finally {
      setIsRunning(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="p-6 bg-flux-bg-secondary rounded-lg">
      <h2 className="text-xl font-bold text-flux-text-primary mb-4">
        Functionality Test Suite
      </h2>
      
      <div className="flex space-x-4 mb-4">
        <Button 
          onClick={runTests} 
          disabled={!newAuthActor || isRunning}
          variant="primary"
        >
          {isRunning ? 'Running Tests...' : 'Run Tests'}
        </Button>
        
        <Button 
          onClick={clearResults} 
          variant="secondary"
        >
          Clear Results
        </Button>
      </div>

      {!newAuthActor && (
        <div className="mb-4 p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
          <p className="text-yellow-200">
            ⚠️ No authentication actor available. Please connect your wallet first.
          </p>
        </div>
      )}

      <div className="bg-flux-bg-primary rounded-lg p-4 max-h-96 overflow-y-auto">
        <h3 className="text-lg font-semibold text-flux-text-primary mb-2">
          Test Results:
        </h3>
        
        {testResults.length === 0 ? (
          <p className="text-flux-text-secondary">No tests run yet.</p>
        ) : (
          <div className="space-y-1">
            {testResults.map((result, index) => (
              <div 
                key={index} 
                className="text-sm font-mono text-flux-text-secondary"
              >
                {result}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
