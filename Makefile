DEBUG ?= 0
STATIC ?= 0

# Submodules
PWD = $(shell pwd)

# Flags
CXX=g++
CXXFLAGS += -std=c++11 -pedantic -W -Wall

ifeq (${STATIC}, 1)
	LDFLAGS += -static -static-libgcc -pthread
endif

ifeq (${DEBUG}, 1)
	CXXFLAGS += -g -O0 -fno-inline -DDEBUG
else ifeq (${DEBUG}, 2)
	CXXFLAGS += -g -O0 -fno-inline -DPROFILE
	LDFLAGS += -lprofiler -ltcmalloc
else
	CXXFLAGS += -O3 -DNDEBUG
endif

# External sources
IDXSOURCES = $(wildcard src/*.cpp) $(wildcard src/*.h)
PBASE=$(shell pwd)

# Targets
TARGETS = src/teal

all:   	$(TARGETS)

src/teal: ${IDXSOURCES}
	$(CXX) $(CXXFLAGS) $@.cpp -o $@ $(LDFLAGS)

clean:
	rm -f $(TARGETS) $(TARGETS:=.o)
