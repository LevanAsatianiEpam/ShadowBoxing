import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, ElementRef, OnDestroy, Output, EventEmitter } from '@angular/core';
import * as poseDetection from '@tensorflow-models/pose-detection';
import '@tensorflow/tfjs-backend-webgl';

interface TechniqueAnalysis {
  overallScore: number;
  stance: {
    score: number;
    feedback: string;
  };
  handPosition: {
    score: number;
    feedback: string;
  };
  footwork: {
    score: number;
    feedback: string;
  };
  balance: {
    score: number;
    feedback: string;
  };
  generalFeedback: string[];
}

@Component({
  selector: 'app-technique-analysis',
  templateUrl: './technique-analysis.component.html',
  imports: [CommonModule],
  styleUrls: ['./technique-analysis.component.css']
})
export class TechniqueAnalysisComponent implements OnInit, OnDestroy {
  @ViewChild('userVideo', { static: false }) userVideoElement: ElementRef;
  @ViewChild('proVideo', { static: false }) proVideoElement: ElementRef;
  @ViewChild('userCanvas', { static: false }) userCanvas: ElementRef;
  @ViewChild('proCanvas', { static: false }) proCanvas: ElementRef;

  @Output() closeRequested = new EventEmitter<void>();

  // Active tab
  activeTab = 'record'; // 'record', 'analyze', 'results'

  // Video recording
  userStream: MediaStream = null;
  mediaRecorder: MediaRecorder = null;
  recordedBlobs: Blob[] = [];
  isRecording = false;
  userVideoURL: string = null;
  proVideoURL: string = null;

  // AI Model
  detector: poseDetection.PoseDetector = null;
  modelLoaded = false;
  loadingModel = false;
  modelLoadError = false;

  // Analysis
  isAnalyzing = false;
  analysisProgress = 0;
  analysisComplete = false;
  techniqueAnalysis: TechniqueAnalysis = null;

  // Camera error handling
  cameraError = false;
  cameraErrorMessage = '';

  constructor() { }

  ngOnInit(): void {
    this.loadPoseDetectionModel();
  }

  ngOnDestroy(): void {
    this.cleanupStreams();
    if (this.userVideoURL) {
      URL.revokeObjectURL(this.userVideoURL);
    }
    if (this.proVideoURL) {
      URL.revokeObjectURL(this.proVideoURL);
    }
  }

  private cleanupStreams(): void {
    if (this.userStream) {
      this.userStream.getTracks().forEach(track => track.stop());
      this.userStream = null;
    }
    if (this.mediaRecorder) {
      this.mediaRecorder = null;
    }
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  close(): void {
    // Clean up resources and emit the event to close the component
    this.cleanupStreams();
    this.closeRequested.emit();
  }

  // Camera and recording methods
  async startCamera(): Promise<void> {
    try {
      // First check if we can enumerate devices (requires permissions)
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      console.log(`Found ${videoDevices.length} video input devices`);
      
      if (videoDevices.length === 0) {
        throw new Error('No video devices found');
      }

      // Try with ideal constraints first
      try {
        this.userStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
      } catch (constraintError) {
        console.warn('Failed with ideal constraints, trying basic constraints:', constraintError);
        
        // If that fails, try with basic constraints
        this.userStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }
      
      // Need to wait for DOM rendering to complete
      setTimeout(() => {
        if (this.userVideoElement && this.userVideoElement.nativeElement) {
          this.userVideoElement.nativeElement.srcObject = this.userStream;
          this.userVideoElement.nativeElement.play().catch(e => {
            console.error('Error playing video:', e);
          });
        }
      }, 100);
    } catch (err) {
      console.error('Error accessing camera:', err);
      
      // Show user-friendly error message based on the error type
      let errorMessage = 'Could not access camera';
      
      if (err.name === 'NotReadableError' || err.name === 'AbortError') {
        errorMessage = 'Camera is already in use by another application. Please close other applications using your camera and try again.';
      } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = 'Camera permission denied. Please allow camera access in your browser settings and try again.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No camera detected. Please connect a camera and try again.';
      }
      
      // Display error message to the user (add this property to your class)
      this.cameraError = true;
      this.cameraErrorMessage = errorMessage;
    }
  }

  /**
   * Resets camera error state and tries to access the camera again
   */
  retryCamera(): void {
    this.cameraError = false;
    this.cameraErrorMessage = '';
    this.startCamera();
  }

  startRecording(): void {
    this.recordedBlobs = [];
    const options = { mimeType: 'video/webm;codecs=vp9,opus' };
    
    try {
      this.mediaRecorder = new MediaRecorder(this.userStream, options);
    } catch (err) {
      console.error('Error creating MediaRecorder:', err);
      return;
    }
    
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.recordedBlobs.push(event.data);
      }
    };
    
    this.mediaRecorder.start();
    this.isRecording = true;
  }

  stopRecording(): void {
    this.mediaRecorder.stop();
    this.isRecording = false;
    
    setTimeout(() => {
      const blob = new Blob(this.recordedBlobs, { type: 'video/webm' });
      this.userVideoURL = URL.createObjectURL(blob);
      
      // Clean up camera stream now that we're done recording
      this.cleanupStreams();
      
      // Need to wait for DOM rendering to complete
      setTimeout(() => {
        this.userVideoElement.nativeElement.srcObject = null;
        this.userVideoElement.nativeElement.src = this.userVideoURL;
        this.userVideoElement.nativeElement.controls = true;
      }, 100);
    }, 100);
  }

  onUserVideoUpload(event: Event): void {
    const file = (event.target as HTMLInputElement).files[0];
    if (!file) return;
    
    if (this.userVideoURL) {
      URL.revokeObjectURL(this.userVideoURL);
    }
    
    this.userVideoURL = URL.createObjectURL(file);
    
    // Need to wait for DOM rendering to complete
    setTimeout(() => {
      this.userVideoElement.nativeElement.srcObject = null;
      this.userVideoElement.nativeElement.src = this.userVideoURL;
      this.userVideoElement.nativeElement.controls = true;
    }, 100);
    
    // Clean up any existing camera stream
    this.cleanupStreams();
  }

  onProVideoUpload(event: Event): void {
    const file = (event.target as HTMLInputElement).files[0];
    if (!file) return;
    
    if (this.proVideoURL) {
      URL.revokeObjectURL(this.proVideoURL);
    }
    
    this.proVideoURL = URL.createObjectURL(file);
    
    // Need to wait for DOM rendering to complete
    setTimeout(() => {
      this.proVideoElement.nativeElement.src = this.proVideoURL;
      this.proVideoElement.nativeElement.controls = true;
    }, 100);
  }

  // AI model methods
  async loadPoseDetectionModel(): Promise<void> {
    this.loadingModel = true;
    try {
      const model = poseDetection.SupportedModels.BlazePose;
      const detectorConfig = {
        runtime: 'mediapipe',
        solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/pose',
        modelType: 'full'
      };
      this.detector = await poseDetection.createDetector(model, detectorConfig);
      
      this.modelLoaded = true;
      console.log('Pose detection model loaded');
    } catch (error) {
      console.error('Failed to load pose detection model:', error);
      this.modelLoadError = true;
    } finally {
      this.loadingModel = false;
    }
  }

  // Analysis methods
  async startAnalysis(): Promise<void> {
    if (!this.userVideoURL || !this.proVideoURL || !this.modelLoaded) {
      return;
    }

    this.isAnalyzing = true;
    this.analysisProgress = 0;
    this.setActiveTab('analyze');

    // Simulate analysis progress (in a real implementation we would process frames)
    this.simulateAnalysisProgress();
  }

  private simulateAnalysisProgress(): void {
    let progress = 0;
    const interval = setInterval(() => {
      progress += 2;
      this.analysisProgress = progress;
      
      if (progress >= 100) {
        clearInterval(interval);
        this.completeAnalysis();
      }
    }, 100);
  }

  private completeAnalysis(): void {
    // In a real implementation, this is where we would calculate actual scores
    // based on pose detection and comparisons between the user and pro videos
    this.techniqueAnalysis = {
      overallScore: this.getRandomScore(60, 92),
      stance: {
        score: this.getRandomScore(50, 95),
        feedback: "Your stance is generally good but could be more stable. Try widening your base and keeping your knees slightly more bent."
      },
      handPosition: {
        score: this.getRandomScore(55, 90),
        feedback: "Your guard is dropping during combinations. Focus on returning to guard position immediately after punches."
      },
      footwork: {
        score: this.getRandomScore(60, 93),
        feedback: "Good movement overall, but sometimes crossing your feet. Work on pivoting rather than crossing when changing directions."
      },
      balance: {
        score: this.getRandomScore(65, 95),
        feedback: "Your weight is well-distributed most of the time. Try to keep weight centered between both feet when not throwing punches."
      },
      generalFeedback: [
        "Overall, your technique shows good fundamentals with some areas to refine.",
        "Your punching speed is good, but you could generate more power by rotating your hips more.",
        "Pay attention to keeping your chin tucked when throwing combinations.",
        "Your movement pattern is becoming predictable - work on varying your footwork and angles."
      ]
    };
    
    this.isAnalyzing = false;
    this.analysisComplete = true;
    setTimeout(() => {
      this.setActiveTab('results');
      // In a real implementation, we would draw pose keypoints on the canvases here
      this.drawPoseKeypoints();
    }, 500);
  }

  private getRandomScore(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private drawPoseKeypoints(): void {
    // In a real implementation, we would draw actual detected pose keypoints here
    // This is a simplified version to demonstrate the concept
    
    const userCtx = this.userCanvas.nativeElement.getContext('2d');
    const proCtx = this.proCanvas.nativeElement.getContext('2d');
    
    // Set canvas dimensions to match videos
    this.userCanvas.nativeElement.width = this.userVideoElement.nativeElement.videoWidth;
    this.userCanvas.nativeElement.height = this.userVideoElement.nativeElement.videoHeight;
    this.proCanvas.nativeElement.width = this.proVideoElement.nativeElement.videoWidth;
    this.proCanvas.nativeElement.height = this.proVideoElement.nativeElement.videoHeight;
    
    // Sample keypoints for visualization (in a real implementation these would come from the pose detector)
    const mockKeypoints = [
      {x: 0.5, y: 0.2},  // Head
      {x: 0.5, y: 0.35}, // Neck
      {x: 0.4, y: 0.45}, // Left shoulder
      {x: 0.6, y: 0.45}, // Right shoulder
      {x: 0.35, y: 0.6}, // Left elbow
      {x: 0.65, y: 0.6}, // Right elbow
      {x: 0.3, y: 0.75}, // Left wrist
      {x: 0.7, y: 0.75}, // Right wrist
      {x: 0.5, y: 0.6},  // Hip
      {x: 0.45, y: 0.8}, // Left knee
      {x: 0.55, y: 0.8}, // Right knee
      {x: 0.45, y: 0.95}, // Left ankle
      {x: 0.55, y: 0.95}  // Right ankle
    ];
    
    // Draw on user canvas
    this.drawKeypointsOnCanvas(userCtx, mockKeypoints, 
      this.userCanvas.nativeElement.width, 
      this.userCanvas.nativeElement.height);
    
    // Draw on pro canvas (slightly different positions to simulate better technique)
    const mockProKeypoints = mockKeypoints.map(point => {
      // Small adjustments to simulate better technique
      return {
        x: point.x + (Math.random() * 0.05 - 0.025),
        y: point.y + (Math.random() * 0.05 - 0.025)
      };
    });
    
    this.drawKeypointsOnCanvas(proCtx, mockProKeypoints,
      this.proCanvas.nativeElement.width,
      this.proCanvas.nativeElement.height);
  }

  private drawKeypointsOnCanvas(ctx: CanvasRenderingContext2D, keypoints: {x: number, y: number}[], width: number, height: number): void {
    ctx.clearRect(0, 0, width, height);
    
    // Draw connections between keypoints (skeleton)
    ctx.strokeStyle = 'rgba(255, 87, 34, 0.8)';
    ctx.lineWidth = 4;
    
    // Connect head to neck
    this.drawLine(ctx, keypoints[0], keypoints[1], width, height);
    
    // Connect neck to shoulders
    this.drawLine(ctx, keypoints[1], keypoints[2], width, height);
    this.drawLine(ctx, keypoints[1], keypoints[3], width, height);
    
    // Connect shoulders to elbows
    this.drawLine(ctx, keypoints[2], keypoints[4], width, height);
    this.drawLine(ctx, keypoints[3], keypoints[5], width, height);
    
    // Connect elbows to wrists
    this.drawLine(ctx, keypoints[4], keypoints[6], width, height);
    this.drawLine(ctx, keypoints[5], keypoints[7], width, height);
    
    // Connect neck to hip
    this.drawLine(ctx, keypoints[1], keypoints[8], width, height);
    
    // Connect hip to knees
    this.drawLine(ctx, keypoints[8], keypoints[9], width, height);
    this.drawLine(ctx, keypoints[8], keypoints[10], width, height);
    
    // Connect knees to ankles
    this.drawLine(ctx, keypoints[9], keypoints[11], width, height);
    this.drawLine(ctx, keypoints[10], keypoints[12], width, height);
    
    // Draw keypoints
    keypoints.forEach(point => {
      ctx.beginPath();
      ctx.arc(
        point.x * width,
        point.y * height,
        6,
        0,
        2 * Math.PI
      );
      ctx.fillStyle = 'rgba(255, 152, 0, 0.9)';
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(
        point.x * width,
        point.y * height,
        4,
        0,
        2 * Math.PI
      );
      ctx.fillStyle = 'white';
      ctx.fill();
    });
  }

  private drawLine(ctx: CanvasRenderingContext2D, start: {x: number, y: number}, end: {x: number, y: number}, width: number, height: number): void {
    ctx.beginPath();
    ctx.moveTo(start.x * width, start.y * height);
    ctx.lineTo(end.x * width, end.y * height);
    ctx.stroke();
  }
}
