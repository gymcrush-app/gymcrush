# iOS Build Troubleshooting

## Fix CocoaPods Encoding Issue

The error `Unicode Normalization not appropriate for ASCII-8BIT` means your terminal needs UTF-8 encoding.

### Quick Fix (Current Session)

```bash
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
```

### Permanent Fix

Add to your `~/.zshrc` (since you're using zsh):

```bash
echo 'export LANG=en_US.UTF-8' >> ~/.zshrc
echo 'export LC_ALL=en_US.UTF-8' >> ~/.zshrc
source ~/.zshrc
```

## Fix CocoaPods CDN Issue

The `Error in the HTTP2 framing layer` is a network/CDN issue. Try these solutions:

### Option 1: Use Git Repo Instead of CDN (Recommended)

```bash
cd ios
pod repo remove trunk
pod install --repo-update
```

If that doesn't work, add the git repo:

```bash
pod repo add-cdn trunk 'https://cdn.cocoapods.org/'
pod install
```

### Option 2: Clear Cache and Retry

```bash
cd ios
rm -rf Pods Podfile.lock
pod cache clean --all
pod install
```

### Option 3: Use Master Repo (Fallback)

```bash
cd ios
pod repo remove trunk
pod repo add master https://github.com/CocoaPods/Specs.git
pod install
```

## Complete Build Process

After fixing the above issues:

```bash
# Set encoding
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

# Clean and rebuild
cd /Users/chrischidgey/dev/gymcrush
rm -rf ios/Pods ios/Podfile.lock
cd ios
pod install

# Then run Expo
cd ..
npx expo run:ios
```

## Alternative: Let Expo Handle It

You can also let Expo retry the build - sometimes the CDN issue is temporary:

```bash
npx expo run:ios
```

If it fails, wait a few minutes and try again. The CocoaPods CDN can have temporary issues.
