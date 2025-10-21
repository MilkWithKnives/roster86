#!/bin/bash
set -e  # Exit on any error
set -u  # Exit on undefined variable

################################################################################
# Installation and Test Script for Restaurant Scheduling Engine
#
# This script will:
# 1. Check Python version
# 2. Install OR-Tools
# 3. Make scripts executable
# 4. Test the new scheduling engine
# 5. Show you the results
################################################################################

echo "================================================================================"
echo "Restaurant Scheduling Engine - Installation & Test"
echo "OptaPlanner-inspired algorithms for roster86"
echo "================================================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check Python version
echo "Step 1: Checking Python installation..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo -e "${GREEN}✓${NC} Found: $PYTHON_VERSION"
else
    echo -e "${RED}✗${NC} Python 3 not found. Please install Python 3.11 or higher."
    exit 1
fi

# Step 2: Install OR-Tools
echo ""
echo "Step 2: Installing OR-Tools (constraint solver)..."
echo "This may take a minute..."

# Try different installation methods
if pip3 install --user ortools --quiet 2>/dev/null; then
    echo -e "${GREEN}✓${NC} OR-Tools installed successfully (via --user flag)"
elif pip3 install ortools --break-system-packages --quiet 2>/dev/null; then
    echo -e "${GREEN}✓${NC} OR-Tools installed successfully (via --break-system-packages)"
else
    echo -e "${YELLOW}⚠${NC} OR-Tools installation may have failed"
    echo "Trying to verify anyway..."
fi

# Step 3: Make Python scripts executable
echo ""
echo "Step 3: Making Python scripts executable..."
chmod +x restaurant_scheduling_engine.py 2>/dev/null || true
chmod +x restaurant_scheduling_runner.py 2>/dev/null || true
chmod +x workforce_scheduling_engine.py 2>/dev/null || true
chmod +x scheduling_runner.py 2>/dev/null || true
echo -e "${GREEN}✓${NC} Python scripts are now executable"

# Step 4: Verify OR-Tools installation
echo ""
echo "Step 4: Verifying OR-Tools installation..."
if python3 -c "from ortools.sat.python import cp_model" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} OR-Tools is working correctly"
else
    echo -e "${RED}✗${NC} OR-Tools verification failed"
    echo ""
    echo "Manual installation steps:"
    echo "  1. pip3 install --user ortools"
    echo "  2. If that fails, try: pip3 install ortools --break-system-packages"
    echo "  3. Or use a virtual environment:"
    echo "     python3 -m venv venv"
    echo "     source venv/bin/activate"
    echo "     pip install ortools"
    exit 1
fi

# Step 5: Run the scheduling engine demo
echo ""
echo "Step 5: Testing the new scheduling engine..."
echo "This will generate a sample restaurant schedule..."
echo ""
echo "================================================================================
"

# Run the scheduler
python3 restaurant_scheduling_engine.py

# Check if it succeeded
if [ $? -eq 0 ]; then
    echo ""
    echo "================================================================================"
    echo -e "${GREEN}✓ SUCCESS!${NC} The scheduling engine is working perfectly."
    echo "================================================================================"
    echo ""
    echo "Next Steps:"
    echo "  1. Read SCHEDULING_UPGRADE_GUIDE.md for integration instructions"
    echo "  2. Read ALGORITHM_IMPLEMENTATION_SUMMARY.md to understand what was built"
    echo "  3. Integrate with your roster86 API (see guide for 3 integration options)"
    echo ""
    echo "Files created:"
    echo "  • restaurant_scheduling_engine.py           - Advanced scheduler"
    echo "  • SCHEDULING_UPGRADE_GUIDE.md              - Installation & integration"
    echo "  • ALGORITHM_IMPLEMENTATION_SUMMARY.md      - Algorithm details"
    echo "  • install_and_test.sh                      - This script"
    echo ""
else
    echo ""
    echo "================================================================================"
    echo -e "${RED}✗ Test failed${NC}"
    echo "================================================================================"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check that OR-Tools is installed: python3 -c 'import ortools'"
    echo "  2. Try running manually: python3 restaurant_scheduling_engine.py"
    echo "  3. Check Python version (need 3.11+): python3 --version"
    echo ""
    exit 1
fi
