import { ElementRef } from '@angular/core';
import { ThreeSceneDirective } from './three-scene.directive';

describe('ThreeSceneDirective', () => {
  it('should create an instance', () => {
     const mockElementRef = { nativeElement: document.createElement('canvas') } as ElementRef;
    const mockPlatformId = {} as Object;
    const directive = new ThreeSceneDirective(mockElementRef, mockPlatformId  );
    expect(directive).toBeTruthy();
  });
});
