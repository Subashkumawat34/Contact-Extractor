import { Component, ElementRef, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

export interface ContactNumber {
  number: string;
  type: string;
  country: string;
}

@Component({
  selector: 'app-extractor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './extractor.component.html',
  styleUrl: './extractor.component.css'
})
export class ExtractorComponent {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  extractedNumbers: ContactNumber[] = [];
  
  isDragging = false;
  isLoading = false;
  error: string | null = null;

  constructor(private http: HttpClient) {}

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
    
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.handleFile(event.dataTransfer.files[0]);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      this.error = 'Please upload a valid image file.';
      return;
    }
    
    this.error = null;
    this.selectedFile = file;
    this.extractedNumbers = [];
    
    // Create preview
    const reader = new FileReader();
    reader.onload = () => {
      this.previewUrl = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  triggerFileInput() {
    this.fileInput.nativeElement.click();
  }

  clearSelection() {
    this.selectedFile = null;
    this.previewUrl = null;
    this.extractedNumbers = [];
    this.error = null;
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  extractContacts() {
    if (!this.selectedFile) return;

    this.isLoading = true;
    this.error = null;

    const formData = new FormData();
    formData.append('image', this.selectedFile);

    this.http.post<any>('http://localhost:3000/api/upload', formData).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          this.extractedNumbers = response.extractedNumbers;
          if (this.extractedNumbers.length === 0) {
            this.error = 'No numbers found in the image.';
          }
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.error = err.error?.error || 'Failed to extract text from the image.';
        console.error(err);
      }
    });
  }

  downloadCSV() {
    if (this.extractedNumbers.length === 0) return;

    // Create CSV content (prepend = to prevent Excel from converting to scientific notation)
    const header = 'Contact Number,Type,Country\n';
    const rows = this.extractedNumbers.map(contact => `="${contact.number}",${contact.type},${contact.country}`).join('\n');
    const csvContent = header + rows;
    
    // Create Blob
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    
    // Trigger download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `contacts_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
